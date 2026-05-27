const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // POST — sauvegarder un commentaire
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      const { id, postId, email, prenom, nom, initials, avatarBg, photo, texte, ts } = data;

      if (!postId || !texte || !email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes' }) };
      }

      const query = `
        INSERT INTO comments (id, post_id, email, prenom, nom, initials, avatarbg, photo, texte, ts)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
        RETURNING *;
      `;
      const values = [
        id, postId, email,
        prenom||null, nom||null, initials||null,
        avatarBg||null, photo||null,
        texte, ts||Date.now()
      ];

      const result = await pool.query(query, values);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, comment: result.rows[0] || {} }) };

    } catch (error) {
      console.error('Erreur sauvegarde commentaire:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  // GET — lire les commentaires d'un post
  if (event.httpMethod === 'GET') {
    try {
      const postId = event.queryStringParameters?.postId;
      if (!postId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId manquant' }) };
      }

      const result = await pool.query(
        'SELECT * FROM comments WHERE post_id = $1 ORDER BY ts ASC',
        [postId]
      );

      // Normaliser pour le frontend
      const comments = result.rows.map(c => ({
        id:        c.id,
        postId:    c.post_id,
        email:     c.email,
        prenom:    c.prenom || '',
        nom:       c.nom || '',
        initials:  c.initials || '?',
        avatarBg:  c.avatarbg || 'linear-gradient(135deg,#B8860B,#FFD700)',
        photo:     c.photo || null,
        texte:     c.texte || c.text || '',
        ts:        parseInt(c.ts) || Date.now()
      }));

      return { statusCode: 200, headers, body: JSON.stringify(comments) };

    } catch (error) {
      console.error('Erreur lecture commentaires:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
