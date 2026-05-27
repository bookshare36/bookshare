const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function ensureTable(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_email TEXT NOT NULL,
      followed_email TEXT NOT NULL,
      ts             BIGINT,
      PRIMARY KEY (follower_email, followed_email)
    );
  `);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  await ensureTable();

  // GET — abonnements d'un utilisateur
  // ?follower=email  → liste des gens que tu suis
  // ?followed=email  → liste de tes abonnés + comptage
  if (event.httpMethod === 'GET') {
    try {
      const { follower, followed, count } = event.queryStringParameters || {};

      if (follower) {
        // Qui est-ce que cet utilisateur suit ?
        const r = await pool.query(
          'SELECT followed_email FROM follows WHERE follower_email = $1',
          [follower]
        );
        return { statusCode: 200, headers, body: JSON.stringify({
          following: r.rows.map(r => r.followed_email),
          count: r.rows.length
        })};
      }

      if (followed) {
        // Qui suit cet utilisateur ?
        const r = await pool.query(
          'SELECT follower_email FROM follows WHERE followed_email = $1',
          [followed]
        );
        return { statusCode: 200, headers, body: JSON.stringify({
          followers: r.rows.map(r => r.follower_email),
          count: r.rows.length
        })};
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'follower ou followed requis' }) };
    } catch(e) {
      console.error('follows GET:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // POST — suivre quelqu'un
  if (event.httpMethod === 'POST') {
    try {
      const { followerEmail, followedEmail } = JSON.parse(event.body);
      if (!followerEmail || !followedEmail) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes' }) };
      }
      if (followerEmail === followedEmail) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Tu ne peux pas te suivre toi-même' }) };
      }
      await pool.query(
        'INSERT INTO follows (follower_email, followed_email, ts) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [followerEmail, followedEmail, Date.now()]
      );
      // Retourner le nouveau comptage
      const r = await pool.query(
        'SELECT COUNT(*) FROM follows WHERE followed_email = $1',
        [followedEmail]
      );
      return { statusCode: 200, headers, body: JSON.stringify({
        success: true,
        followers: parseInt(r.rows[0].count)
      })};
    } catch(e) {
      console.error('follows POST:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // DELETE — se désabonner
  if (event.httpMethod === 'DELETE') {
    try {
      const { followerEmail, followedEmail } = JSON.parse(event.body);
      await pool.query(
        'DELETE FROM follows WHERE follower_email=$1 AND followed_email=$2',
        [followerEmail, followedEmail]
      );
      const r = await pool.query(
        'SELECT COUNT(*) FROM follows WHERE followed_email=$1',
        [followedEmail]
      );
      return { statusCode: 200, headers, body: JSON.stringify({
        success: true,
        followers: parseInt(r.rows[0].count)
      })};
    } catch(e) {
      console.error('follows DELETE:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
