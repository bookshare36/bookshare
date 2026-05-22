const { Pool } = require('pg');

// Connexion à ta base de données Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event, context) => {
  // Les fameux headers pour laisser passer les données (CORS)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 1. QUAND QUELQU'UN CLIQUE SUR LE BOUTON EURÊKA (POST)
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      const { postId, email } = data;

      if (!postId || !email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes' }) };
      }

      // A. On vérifie si l'utilisateur a déjà liké ce post
      const checkQuery = 'SELECT * FROM likes WHERE postid = $1 AND email = $2';
      const checkResult = await pool.query(checkQuery, [postId, email]);

      let isNowLiked = false;

      if (checkResult.rows.length > 0) {
        // S'il avait déjà liké, on supprime le like (Unlike)
        await pool.query('DELETE FROM likes WHERE postid = $1 AND email = $2', [postId, email]);
        isNowLiked = false;
      } else {
        // S'il n'avait pas liké, on l'ajoute dans la base (Like)
        await pool.query('INSERT INTO likes (postid, email) VALUES ($1, $2)', [postId, email]);
        isNowLiked = true;
      }

      // B. On recompte le vrai total de likes pour ce post
      const countResult = await pool.query('SELECT COUNT(*) FROM likes WHERE postid = $1', [postId]);
      const newCount = parseInt(countResult.rows[0].count, 10);

      // C. On renvoie la bonne nouvelle au navigateur !
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

  // 2. QUAND LE SITE S'OUVRE ET VEUT AFFICHER LES COMPTEURS (GET)
  if (event.httpMethod === 'GET') {
    try {
      const postId = event.queryStringParameters.postId;
      const userEmail = event.queryStringParameters.userEmail;

      if (!postId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId manquant' }) };
      }

      // A. Compter le total des likes
      const countResult = await pool.query('SELECT COUNT(*) FROM likes WHERE postid = $1', [postId]);
      const totalCount = parseInt(countResult.rows[0].count, 10);

      // B. Vérifier si l'utilisateur actuel a liké (pour allumer le bouton en jaune)
      let userHasLiked = false;
      if (userEmail) {
        const checkResult = await pool.query('SELECT * FROM likes WHERE postid = $1 AND email = $2', [postId, userEmail]);
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
