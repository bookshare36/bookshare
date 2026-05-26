const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // GET — tous les posts
  if (event.httpMethod === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM posts ORDER BY ts DESC');
      // Normaliser les colonnes pour le frontend
      const posts = result.rows.map(p => ({
        id:           p.id,
        email:        p.email,
        prenom:       p.prenom,
        nom:          p.nom,
        initials:     p.initials,
        avatarBg:     p.avatarbg,
        photo:        p.photo || null,
        texte:        p.texte,
        titre:        p.titre || '',
        type:         p.type || p.contenttype || 'livre',
        typeBadge:    p.typebadge || '',
        meta:         p.meta || '',
        ville:        p.ville || '',
        visibility:   p.visibility || '🌍 Public',
        categorie:    p.categorie || '',
        ts:           parseInt(p.ts) || Date.now(),
        eu:           parseInt(p.eu) || 0,
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ posts }) };
    } catch (error) {
      console.error('Erreur lecture posts:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  // POST — créer un post ou signalement
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);

      // Signalement
      if (data.action === 'report') {
        console.log(`Signalement post ${data.postId} par ${data.email}`);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      // Création d'un post
      const {
        id, email, prenom, nom, initials, avatarBg, photo,
        texte, titre, type, typeBadge, meta, ville,
        visibility, categorie, ts
      } = data;

      if (!id || !email || !texte) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes' }) };
      }

      const query = `
        INSERT INTO posts 
          (id, email, prenom, nom, initials, avatarbg, photo,
           texte, titre, type, typebadge, meta, ville,
           visibility, categorie, ts, eu)
        VALUES 
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,0)
        RETURNING *;
      `;
      const values = [
        id, email, prenom||'', nom||'', initials||'', avatarBg||'', photo||null,
        texte, titre||'', type||'livre', typeBadge||'', meta||'', ville||'',
        visibility||'🌍 Public', categorie||'', ts||Date.now()
      ];

      const result = await pool.query(query, values);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, post: result.rows[0] }) };

    } catch (error) {
      console.error('Erreur sauvegarde post:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  // DELETE — supprimer un post
  if (event.httpMethod === 'DELETE') {
    try {
      const { id, email } = JSON.parse(event.body);
      if (!id || !email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id et email requis' }) };
      }
      await pool.query('DELETE FROM posts WHERE id=$1 AND email=$2', [id, email]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (error) {
      console.error('Erreur suppression post:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
