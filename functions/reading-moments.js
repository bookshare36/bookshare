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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_moments (
        id           TEXT PRIMARY KEY,
        email        TEXT,
        prenom       TEXT,
        initials     TEXT,
        avatar_bg    TEXT,
        avatar_photo TEXT,
        lieu         TEXT,
        livre        TEXT,
        photo        TEXT,
        ville        TEXT,
        ts           BIGINT,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`ALTER TABLE reading_moments ADD COLUMN IF NOT EXISTS avatar_photo TEXT`).catch(()=>{});
    await pool.query(`ALTER TABLE reading_moments ADD COLUMN IF NOT EXISTS ville TEXT`).catch(()=>{});

    if (event.httpMethod === 'GET') {
      const since = Date.now() - 24 * 60 * 60 * 1000;
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
        avatarPhoto: r.avatar_photo || null,
        lieu: r.lieu,
        livre: r.livre,
        photo: r.photo,
        ville: r.ville || '',
        ts: Number(r.ts)
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ moments }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { id, email, prenom, initials, avatarBg, avatarPhoto, lieu, livre, photo, ville, ts } = body;

      if (!lieu) return { statusCode: 400, headers, body: JSON.stringify({ error: 'lieu requis' }) };

      if (email) await pool.query('DELETE FROM reading_moments WHERE email = $1', [email]);

      await pool.query(`
        INSERT INTO reading_moments (id, email, prenom, initials, avatar_bg, avatar_photo, lieu, livre, photo, ville, ts)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `, [
        id || 'rm_' + Date.now(),
        email || '',
        prenom || 'Anonyme',
        initials || '?',
        avatarBg || '#B8860B',
        avatarPhoto || null,
        lieu,
        livre || '',
        photo || null,
        ville || '',
        ts || Date.now()
      ]);

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      if (!body.email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email requis' }) };
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
