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
    // 1. Création de la table de base
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id         TEXT PRIMARY KEY,
        post_id    TEXT,
        email      TEXT,
        auteur     TEXT,
        initials   TEXT,
        avatar_bg  TEXT,
        texte      TEXT,
        ts         BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. Ajout automatique des colonnes pour correspondre à ton site
    await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS avatar_bg TEXT`);
    await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS email TEXT`);
    await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS prenom TEXT`);
    await pool.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS nom TEXT`);

    // 3. GET — récupérer les commentaires d'un post
    if (event.httpMethod === 'GET') {
      const postId = event.queryStringParameters?.postId;
      if (!postId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId requis' }) };
      
      const result = await pool.query('SELECT * FROM comments WHERE post_id=$1 ORDER BY ts ASC', [postId]);
      await pool.end();
      
      // TRADUCTION DE NEON VERS TON SITE
      const comments = result.rows.map(row => ({
        id: row.id,
        postId: row.post_id,
        email: row.email,
        prenom: row.prenom || row.auteur || 'Anonyme',
        nom: row.nom || '',
        initials: row.initials,
        avatarBg: row.avatar_bg,
        texte: row.texte,
        ts: Number(row.ts)
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ comments }) };
    }

    // 4. POST — ajouter un commentaire
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      if (!body.postId || !body.texte) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId et texte requis' }) };
      }

      await pool.query(`
        INSERT INTO comments (id, post_id, email, prenom, nom, initials, avatar_bg, texte, ts)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        body.id || 'c_' + Date.now(),
        body.postId,
        body.email || '',
        body.prenom || 'Anonyme',
        body.nom || '',
        body.initials || '?',
        body.avatarBg || '',
        body.texte,
        body.ts || Date.now()
      ]);

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // 5. DELETE — supprimer un commentaire
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id requis' }) };
      await pool.query('DELETE FROM comments WHERE id=$1', [id]);
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    await pool.end();
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  } catch (err) {
    console.error('comments error:', err.message);
    await pool.end().catch(()=>{});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
