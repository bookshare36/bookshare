const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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

  // 1. POST : AJOUTER OU ENLEVER UN LIKE
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      const { postId, email } = data;

      if (!postId || !email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes' }) };
      }

      // ON UTILISE post_id AVEC LE TIRET DU BAS !
      const checkResult = await pool.query('SELECT * FROM likes WHERE post_id = $1 AND email = $2', [postId, email]);

      let isNowLiked = false;

      if (checkResult.rows.length > 0) {
        // Enlever le like
        await pool.query('DELETE FROM likes WHERE post_id = $1 AND email = $2', [postId, email]);
        isNowLiked = false;
      } else {
        // Ajouter le like
        await pool.query('INSERT INTO likes (post_id, email) VALUES ($1, $2)', [postId, email]);
        isNowLiked = true;
      }

      // Recompter
      const countResult = await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId]);
      const newCount = parseInt(countResult.rows[0].count, 10);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, liked: isNowLiked, count: newCount })
      };

    } catch (error) {
      console.error("Erreur de traitement du like:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Impossible de sauvegarder le like' }) };
    }
  }

  // 2. GET : LIRE LES LIKES AU CHARGEMENT DE LA PAGE
  if (event.httpMethod === 'GET') {
    try {
      const postId = event.queryStringParameters.postId;
      const userEmail = event.queryStringParameters.userEmail;

      if (!postId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId manquant' }) };
      }

      // ON UTILISE post_id ICI AUSSI
      const countResult = await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId]);
      const totalCount = parseInt(countResult.rows[0].count, 10);

      let userHasLiked = false;
      if (userEmail) {
        const checkResult = await pool.query('SELECT * FROM likes WHERE post_id = $1 AND email = $2', [postId, userEmail]);
        userHasLiked = checkResult.rows.length > 0;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ count: totalCount, liked: userHasLiked })
      };

    } catch (error) {
      console.error("Erreur de lecture des likes:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur de lecture serveur' }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
