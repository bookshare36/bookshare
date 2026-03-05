const { Pool } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Créer la table si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_moments (
        id          TEXT PRIMARY KEY,
        email       TEXT,
        prenom      TEXT,
        initials    TEXT,
        avatar_bg   TEXT,
        lieu        TEXT,
        livre       TEXT,
        photo       TEXT,        -- base64 image (peut être NULL)
        ts          BIGINT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // GET — récupérer les moments des dernières 24h
    if (event.httpMethod === 'GET') {
      const since = Date.now() - 24 * 60 * 60 * 1000; // 24h
      const result = await pool.query(
        'SELECT * FROM reading_moments WHERE ts > $1 ORDER BY ts DESC LIMIT 30',
        [since]
      );
      await pool.end();
      const moments = result.rows.map(r => ({
        id: r.id,
        email: r.email,
        prenom: r.prenom,
        initials: r.initials,
        avatarBg: r.avatar_bg,
        lieu: r.lieu,
        livre: r.livre,
        photo: r.photo,
        ts: Number(r.ts)
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ moments }) };
    }

    // POST — publier un nouveau moment
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { id, email, prenom, initials, avatarBg, lieu, livre, photo, ts } = body;

      if (!lieu) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'lieu requis' }) };
      }

      // Supprimer l'ancien moment du même utilisateur (1 moment actif par user)
      if (email) {
        await pool.query('DELETE FROM reading_moments WHERE email = $1', [email]);
      }

      await pool.query(`
        INSERT INTO reading_moments (id, email, prenom, initials, avatar_bg, lieu, livre, photo, ts)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        id || 'rm_' + Date.now(),
        email || '',
        prenom || 'Anonyme',
        initials || '?',
        avatarBg || '#B8860B',
        lieu,
        livre || '',
        photo || null,
        ts || Date.now()
      ]);

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // DELETE — supprimer son moment (quand l'utilisateur arrête de partager)
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      if (!body.email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'email requis' }) };
      }
      await pool.query('DELETE FROM reading_moments WHERE email = $1', [body.email]);
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    await pool.end();
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  } catch (err) {
    console.error('reading-moments error:', err.message);
    await pool.end().catch(() => {});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
