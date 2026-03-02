const { Resend } = require('resend');
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { email, prenom } = JSON.parse(event.body);
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email requis' }) };
    }

    // Générer code 4 chiffres
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Sauvegarder le code dans Neon
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    await sql`
      INSERT INTO two_fa_codes (email, code, expires_at)
      VALUES (${email}, ${code}, ${expiresAt.toISOString()})
      ON CONFLICT (email) DO UPDATE SET code = ${code}, expires_at = ${expiresAt.toISOString()}
    `;

    // Déterminer Bonjour ou Bonsoir selon l'heure
    const hour = new Date().getHours();
    const salutation = hour >= 18 || hour < 6 ? 'Bonsoir' : 'Bonjour';

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'BookShare <noreply@bookshare.fr>',
      to: email,
      subject: '🔐 Votre code de connexion BookShare',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px 20px;background:#fff;">
          
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#C8882A;font-size:28px;margin:0;">📚 BookShare</h1>
            <p style="color:#888;font-size:12px;margin:4px 0 0;">Le savoir partagé, humblement.</p>
          </div>

          <p style="color:#333;font-size:15px;line-height:1.7;margin-bottom:20px;">
            ${salutation} cher ${prenom || 'utilisateur'},
          </p>

          <p style="color:#555;line-height:1.7;margin-bottom:24px;">
            Veuillez retrouver le code ci-dessous pour vous connecter à votre compte.
          </p>

          <div style="background:#FFF8EE;border:2px solid #C8882A;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#C8882A;">${code}</div>
          </div>

          <p style="color:#999;font-size:12px;text-align:center;margin-bottom:28px;">
            Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.
          </p>

          <hr style="border:none;border-top:1px solid #eee;margin-bottom:16px;">

          <p style="color:#555;line-height:1.7;margin:0;">
            <strong>L'équipe Bookshare</strong>
          </p>
          <p style="color:#C8882A;font-style:italic;font-size:13px;margin-top:4px;">
            Le savoir partagé, humblement !
          </p>

        </div>
      `
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('2FA error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
