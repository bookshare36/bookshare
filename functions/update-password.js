const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  try {
    const { email, newPwd, photo } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email requis' }) };

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        email      TEXT PRIMARY KEY,
        pwd        TEXT,
        nom        TEXT,
        prenom     TEXT,
        ville      TEXT,
        photo      TEXT,
        joined     TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT`).catch(()=>{});

    if (newPwd) {
      // Hasher le nouveau mot de passe
      const hashedPwd = await bcrypt.hash(newPwd, 10);
      await pool.query(`
        INSERT INTO users (email, pwd, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (email) DO UPDATE SET pwd = $2, updated_at = NOW()
      `, [email, hashedPwd]);
    }

    if (photo) {
      await pool.query(`
        INSERT INTO users (email, photo, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (email) DO UPDATE SET photo = $2, updated_at = NOW()
      `, [email, photo]);
    }

    await pool.end();
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('update-password error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
