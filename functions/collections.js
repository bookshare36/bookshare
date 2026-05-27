const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function ensureTable(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collections (
      id         TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      name       TEXT NOT NULL,
      emoji      TEXT DEFAULT '📂',
      post_ids   TEXT DEFAULT '[]',
      ts         BIGINT NOT NULL
    );
  `);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  await ensureTable();

  // GET — collections d'un utilisateur (?email=xxx) ou toutes (?all=true)
  if (event.httpMethod === 'GET') {
    try {
      const { email, all } = event.queryStringParameters || {};
      let result;
      if (all) {
        result = await pool.query('SELECT * FROM collections ORDER BY ts DESC');
      } else if (email) {
        result = await pool.query(
          'SELECT * FROM collections WHERE user_email = $1 ORDER BY ts DESC',
          [email]
        );
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'email requis' }) };
      }
      const collections = result.rows.map(c => ({
        id:        c.id,
        userEmail: c.user_email,
        name:      c.name,
        emoji:     c.emoji,
        posts:     JSON.parse(c.post_ids || '[]'),
        ts:        parseInt(c.ts)
      }));
      return { statusCode: 200, headers, body: JSON.stringify(collections) };
    } catch(e) {
      console.error('collections GET:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // POST — créer une collection
  if (event.httpMethod === 'POST') {
    try {
      const { id, userEmail, name, emoji, posts, ts } = JSON.parse(event.body);
      if (!id || !userEmail || !name) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes' }) };
      }
      await pool.query(
        `INSERT INTO collections (id, user_email, name, emoji, post_ids, ts)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name=$3, emoji=$4, post_ids=$5`,
        [id, userEmail, name, emoji||'📂', JSON.stringify(posts||[]), ts||Date.now()]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch(e) {
      console.error('collections POST:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // PUT — mettre à jour les posts d'une collection
  if (event.httpMethod === 'PUT') {
    try {
      const { id, posts, userEmail } = JSON.parse(event.body);
      if (!id || !userEmail) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id et userEmail requis' }) };
      }
      await pool.query(
        'UPDATE collections SET post_ids=$1 WHERE id=$2 AND user_email=$3',
        [JSON.stringify(posts||[]), id, userEmail]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch(e) {
      console.error('collections PUT:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // DELETE — supprimer une collection
  if (event.httpMethod === 'DELETE') {
    try {
      const { id, userEmail } = JSON.parse(event.body);
      await pool.query(
        'DELETE FROM collections WHERE id=$1 AND user_email=$2',
        [id, userEmail]
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch(e) {
      console.error('collections DELETE:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
