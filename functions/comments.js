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
      CREATE TABLE IF NOT EXISTS comments (
        id         TEXT PRIMARY KEY,
        post_id    TEXT,
        email      TEXT,
        auteur     TEXT,
        initials   TEXT,
        texte      TEXT,
        ts         BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // GET — récupérer les commentaires d'un post
    if (event.httpMethod === 'GET') {
      const postId = event.queryStringParameters?.postId;
      if (!postId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId requis' }) };
      const result = await pool.query('SELECT * FROM comments WHERE post_id=$1 ORDER BY ts ASC', [postId]);
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ comments: result.rows }) };
    }

    // POST — ajouter un commentaire
    if (event.httpMethod === 'POST') {
      const { id, postId, email, auteur, initials, texte, ts } = JSON.parse(event.body || '{}');
      if (!postId || !texte) return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId et texte requis' }) };

      await pool.query(`
        INSERT INTO comments (id, post_id, email, auteur, initials, texte, ts)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [id || 'c_'+Date.now(), postId, email||'', auteur||'', initials||'', texte, ts||Date.now()]);

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // DELETE — supprimer un commentaire
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id requis' }) };
      await pool.query('DELETE FROM comments WHERE id=$1', [id]);
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    await pool.end();
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  } catch (err) {
    console.error('comments error:', err.message);
    await pool.end().catch(()=>{});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
