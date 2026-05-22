const { Pool } = require('pg');

// Connexion à ta base Neon
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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 1. AFFICHER TOUS LES POSTS (GET)
  if (event.httpMethod === 'GET') {
    try {
      // On récupère tous les posts du plus récent au plus ancien
      const result = await pool.query('SELECT * FROM posts ORDER BY ts DESC');
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify(result.rows) 
      };
    } catch (error) {
      console.error("Erreur de lecture des posts:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Impossible de lire les posts" }) };
    }
  }

  // 2. PUBLIER UN NOUVEAU POST OU UN SIGNALEMENT (POST)
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);

      // Si c'est un signalement (bouton "Signaler" qu'on a vu dans ton code)
      if (data.action === 'report') {
        console.log(`Signalement reçu pour le post ${data.postId} par ${data.email}`);
        // Ici, on répond juste que c'est bien reçu pour rassurer le navigateur
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      // Sinon, c'est la création d'un vrai Post
      const { id, email, prenom, nom, initials, avatarBg, texte, ts, contentType } = data;

      if (!id || !email || !texte) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes pour le post' }) };
      }

      const query = `
        INSERT INTO posts (id, email, prenom, nom, initials, avatarbg, texte, ts, contenttype, eu)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
        RETURNING *;
      `;
      const values = [id, email, prenom, nom, initials, avatarBg, texte, ts, contentType || 'text'];
      
      const result = await pool.query(query, values);

      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ success: true, post: result.rows[0] }) 
      };

    } catch (error) {
      console.error("Erreur de sauvegarde du post:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Impossible de sauvegarder le post" }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
