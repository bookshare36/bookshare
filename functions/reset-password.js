const { Pool } = require('pg');
const { Resend } = require('resend');
const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        email      TEXT PRIMARY KEY,
        token      TEXT,
        expires_at BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const { email } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email requis' }) };

    // Vérifier que l'email existe
    const user = await pool.query('SELECT prenom, pwd FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      await pool.end();
      // On retourne ok quand même pour ne pas révéler si l'email existe
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    const prenom = user.rows[0].prenom || 'Membre';
    const pwd = user.rows[0].pwd || '';

    // Compte Google — pas de mot de passe
    if(pwd === '__google__' || pwd === ''){
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ error: 'google_account' }) };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 heure

    await pool.query(`
      INSERT INTO password_resets (email, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
    `, [email, token, expiresAt]);

    await pool.end();

    // Envoyer l'email
    const resend = new Resend(process.env.RESEND_API_KEY);
    const resetLink = `https://bookshare.fr?reset_token=${token}&email=${encodeURIComponent(email)}`;

    await resend.emails.send({
      from: 'BookShare <noreply@bookshare.fr>',
      to: email,
      subject: 'Réinitialisation de votre mot de passe BookShare',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:30px 20px;background:#fff;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#C8882A;font-size:28px;margin:0;">📚 BookShare</h1>
            <p style="color:#888;font-size:12px;margin:4px 0 0;">Le savoir partagé, humblement.</p>
          </div>
          <h2 style="color:#1A0A00;font-size:20px;margin-bottom:6px;">Bonjour ${prenom},</h2>
          <p style="color:#333;line-height:1.7;margin-bottom:20px;">
            Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
          </p>
          <div style="background:#FFF8EE;border-left:4px solid #C8882A;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="color:#555;margin:0;font-size:13px;">⏱️ Ce lien est valable <strong>1 heure</strong> seulement.</p>
          </div>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#C8882A,#FFD700);color:#1A0A00;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">
              Réinitialiser mon mot de passe →
            </a>
          </div>
          <p style="color:#999;font-size:12px;line-height:1.6;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe reste inchangé.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin-bottom:16px;">
          <p style="color:#555;line-height:1.7;margin:0;">
            L'équipe BookShare<br>
            <span style="color:#C8882A;font-style:italic;font-size:13px;">Le savoir partagé, humblement !</span>
          </p>
        </div>
      `
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('reset-password error:', err.message);
    await pool.end().catch(()=>{});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
