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
      CREATE TABLE IF NOT EXISTS ads (
        id          TEXT PRIMARY KEY,
        email       TEXT,
        text        TEXT,
        media_data  TEXT,
        media_type  TEXT,
        link        TEXT,
        ts          BIGINT,
        expires_at  BIGINT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // GET — pubs actives non expirées
    if (event.httpMethod === 'GET') {
      const now = Date.now();
      const result = await pool.query(
        'SELECT id, email, text, media_data, media_type, link, ts, expires_at FROM ads WHERE expires_at > $1 ORDER BY ts DESC',
        [now]
      );
      await pool.end();
      const ads = result.rows.map(r => ({
        id: r.id,
        email: r.email,
        text: r.text,
        mediaData: r.media_data || null,
        mediaType: r.media_type || null,
        link: r.link,
        ts: Number(r.ts),
        expiresAt: Number(r.expires_at)
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ ads }) };
    }

    // POST — publier une pub
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { id, email, text, mediaData, mediaType, link, ts, expiresAt } = body;
      if (!text || !link) return { statusCode: 400, headers, body: JSON.stringify({ error: 'text et link requis' }) };

      // Supprimer l'ancienne pub du même utilisateur
      if (email) await pool.query('DELETE FROM ads WHERE email = $1', [email]);

      await pool.query(`
        INSERT INTO ads (id, email, text, media_data, media_type, link, ts, expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        id || 'ad_' + Date.now(),
        email || '',
        text,
        mediaData || null,
        mediaType || null,
        link,
        ts || Date.now(),
        expiresAt || (Date.now() + 2 * 24 * 60 * 60 * 1000)
      ]);

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    await pool.end();
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  } catch (err) {
    console.error('ads error:', err.message);
    await pool.end().catch(() => {});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
