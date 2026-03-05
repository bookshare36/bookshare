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
      CREATE TABLE IF NOT EXISTS likes (
        post_id    TEXT,
        email      TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (post_id, email)
      )
    `);

    // GET — récupérer les likes d'un post
    if (event.httpMethod === 'GET') {
      const postId = event.queryStringParameters?.postId;
      if (!postId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId requis' }) };
      const result = await pool.query('SELECT email FROM likes WHERE post_id = $1', [postId]);
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ likes: result.rows.map(r=>r.email), count: result.rows.length }) };
    }

    // POST — ajouter ou retirer un like (toggle)
    if (event.httpMethod === 'POST') {
      const { postId, email } = JSON.parse(event.body || '{}');
      if (!postId || !email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId et email requis' }) };

      const existing = await pool.query('SELECT 1 FROM likes WHERE post_id=$1 AND email=$2', [postId, email]);
      let liked;
      if (existing.rows.length > 0) {
        await pool.query('DELETE FROM likes WHERE post_id=$1 AND email=$2', [postId, email]);
        await pool.query('UPDATE posts SET eu = GREATEST(0, eu - 1) WHERE id=$1', [postId]);
        liked = false;
      } else {
        await pool.query('INSERT INTO likes (post_id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, email]);
        await pool.query('UPDATE posts SET eu = eu + 1 WHERE id=$1', [postId]);
        liked = true;
      }

      const count = await pool.query('SELECT COUNT(*) FROM likes WHERE post_id=$1', [postId]);
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ liked, count: Number(count.rows[0].count) }) };
    }

    await pool.end();
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  } catch (err) {
    console.error('likes error:', err.message);
    await pool.end().catch(()=>{});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
