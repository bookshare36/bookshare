const { Pool } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email requis' }) };

    // Supprimer dans toutes les tables
    await pool.query('DELETE FROM posts WHERE email = $1', [email]);
    await pool.query('DELETE FROM comments WHERE email = $1', [email]);
    await pool.query('DELETE FROM reading_moments WHERE email = $1', [email]);
    await pool.query('DELETE FROM likes WHERE user_email = $1', [email]).catch(()=>{});
    await pool.query('DELETE FROM users WHERE email = $1', [email]).catch(()=>{});

    await pool.end();
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('delete-account error:', err.message);
    await pool.end().catch(() => {});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
