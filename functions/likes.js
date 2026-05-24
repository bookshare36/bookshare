const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST : ajouter ou enlever un like
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      const { postId, email } = data;

      if (!postId || !email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes' }) };
      }

      const checkResult = await pool.query(
        'SELECT * FROM likes WHERE post_id = $1 AND email = $2',
        [postId, email]
      );

      let isNowLiked = false;
      if (checkResult.rows.length > 0) {
        await pool.query('DELETE FROM likes WHERE post_id = $1 AND email = $2', [postId, email]);
        isNowLiked = false;
      } else {
        await pool.query('INSERT INTO likes (post_id, email) VALUES ($1, $2)', [postId, email]);
        isNowLiked = true;
      }

      const countResult = await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId]);
      const newCount = parseInt(countResult.rows[0].count, 10);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, liked: isNowLiked, count: newCount })
      };

    } catch (error) {
      console.error("Erreur de traitement du like:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  // GET : deux modes
  // 1. ?postId=X&userEmail=Y  → état d'un seul post
  // 2. ?userEmail=Y           → tous les postIds likés par cet utilisateur
  if (event.httpMethod === 'GET') {
    try {
      const { postId, userEmail } = event.queryStringParameters || {};

      // Mode 2 : tous les likes d'un utilisateur
      if (!postId && userEmail) {
        const result = await pool.query(
          'SELECT post_id FROM likes WHERE email = $1',
          [userEmail]
        );
        const likedIds = result.rows.map(r => r.post_id);
        return { statusCode: 200, headers, body: JSON.stringify({ likedIds }) };
      }

      // Mode 1 : état d'un post précis
      if (!postId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId manquant' }) };
      }

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM likes WHERE post_id = $1',
        [postId]
      );
      const totalCount = parseInt(countResult.rows[0].count, 10);

      let userHasLiked = false;
      if (userEmail) {
        const checkResult = await pool.query(
          'SELECT 1 FROM likes WHERE post_id = $1 AND email = $2',
          [postId, userEmail]
        );
        userHasLiked = checkResult.rows.length > 0;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ count: totalCount, liked: userHasLiked })
      };

    } catch (error) {
      console.error("Erreur de lecture des likes:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
