const { Pool } = require('pg');

// Connexion à ta base de données Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event, context) => {
  // Ces headers permettent à ton site de communiquer avec le serveur sans être bloqué
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // 1. Réponse de politesse pour le navigateur (CORS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 2. RÉCEPTION D'UN NOUVEAU COMMENTAIRE (POST)
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      const { id, postId, email, prenom, nom, initials, avatarBg, texte, ts } = data;

      // On vérifie qu'on a bien reçu l'essentiel
      if (!postId || !texte || !email) {
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ error: 'Données manquantes' }) 
        };
      }

      // On insère le commentaire dans la table Neon qu'on a créée tout à l'heure !
      const query = `
        INSERT INTO comments (id, postid, email, prenom, nom, initials, avatarbg, texte, ts)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;
      const values = [id, postId, email, prenom, nom, initials, avatarBg, texte, ts];

      const result = await pool.query(query, values);

      // On répond au site que tout s'est bien passé !
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, comment: result.rows[0] })
      };

    } catch (error) {
      console.error("Erreur lors de la sauvegarde du commentaire:", error);
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: "Impossible de sauvegarder dans la base de données" }) 
      };
    }
  }

  // 3. LECTURE DES COMMENTAIRES (GET)
  if (event.httpMethod === 'GET') {
    try {
      const postId = event.queryStringParameters.postId;
      if (!postId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId manquant' }) };
      }

      const result = await pool.query('SELECT * FROM comments WHERE postid = $1 ORDER BY ts ASC', [postId]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    } catch (error) {
      console.error("Erreur de lecture:", error);
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: "Impossible de lire la base de données" }) 
      };
    }
  }

  // Si on essaie de faire autre chose, on refuse
  return { 
    statusCode: 405, 
    headers, 
    body: JSON.stringify({ error: 'Méthode non autorisée' }) 
  };
};
