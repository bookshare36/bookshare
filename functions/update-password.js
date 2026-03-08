const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const body = JSON.parse(event.body || '{}');

    // POST — réinitialisation via token
    if (event.httpMethod === 'POST' && body.token) {
      const { email, token, newPwd } = body;
      if (!email || !token || !newPwd) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'email, token et newPwd requis' }) };
      }

      // Vérifier le token
      const result = await pool.query(
        'SELECT * FROM password_resets WHERE email = $1 AND token = $2',
        [email, token]
      );

      if (result.rows.length === 0) {
        await pool.end();
        return { statusCode: 200, headers, body: JSON.stringify({ error: 'token_invalid' }) };
      }

      const reset = result.rows[0];
      if (Number(reset.expires_at) < Date.now()) {
        await pool.end();
        return { statusCode: 200, headers, body: JSON.stringify({ error: 'token_expired' }) };
      }

      // Hasher et mettre à jour le mot de passe
      const hashedPwd = await bcrypt.hash(newPwd, 10);
      await pool.query('UPDATE users SET pwd = $1, updated_at = NOW() WHERE email = $2', [hashedPwd, email]);
      await pool.query('DELETE FROM password_resets WHERE email = $1', [email]);
      await pool.end();

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // PUT — mise à jour photo ou mot de passe depuis profil
    if (event.httpMethod === 'PUT') {
      const { email, photo, pwd } = body;
      if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email requis' }) };

      if (photo !== undefined) {
        await pool.query('UPDATE users SET photo = $1, updated_at = NOW() WHERE email = $2', [photo, email]);
      }
      if (pwd) {
        const hashedPwd = await bcrypt.hash(pwd, 10);
        await pool.query('UPDATE users SET pwd = $1, updated_at = NOW() WHERE email = $2', [hashedPwd, email]);
      }

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    await pool.end();
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  } catch (err) {
    console.error('update-password error:', err.message);
    await pool.end().catch(()=>{});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
