const { Pool } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', // <-- J'AI AJOUTÉ DELETE ICI !
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Création de la table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id           TEXT PRIMARY KEY,
        type         TEXT,
        titre        TEXT,
        meta         TEXT,
        texte        TEXT,
        type_badge   TEXT,
        specific_metas TEXT,
        note         INTEGER DEFAULT 0,
        ts           BIGINT,
        auteur       TEXT,
        initials     TEXT,
        avatar_bg    TEXT,
        email        TEXT,
        ville        TEXT,
        eu           INTEGER DEFAULT 0,
        likes        TEXT DEFAULT '[]',
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. ENREGISTRER UN NOUVEAU POST
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const p = body.post;

      if (!p || !p.id) {
        await pool.end();
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Post invalide' }) };
      }

      await pool.query(`
        INSERT INTO posts (id, type, titre, meta, texte, type_badge, specific_metas, note, ts, auteur, initials, avatar_bg, email, ville, eu, likes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          eu = EXCLUDED.eu,
          likes = EXCLUDED.likes
      `, [
        p.id, p.type || '', p.titre || '', p.meta || '', p.texte || '', 
        p.typeBadge || '', p.specificMetas || '', p.note || 0, p.ts || Date.now(), 
        p.auteur || '', p.initials || '', p.avatarBg || '', p.email || '', 
        p.ville || '', p.eu || 0, JSON.stringify(p.likes || [])
      ]);

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // 3. LIRE TOUS LES POSTS
    if (event.httpMethod === 'GET') {
      const result = await pool.query('SELECT * FROM posts ORDER BY ts DESC LIMIT 100');
      await pool.end();
      
      const posts = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        titre: row.titre,
        meta: row.meta,
        texte: row.texte,
        typeBadge: row.type_badge,
        specificMetas: row.specific_metas,
        note: row.note,
        ts: Number(row.ts),
        auteur: row.auteur,
        initials: row.initials,
        avatarBg: row.avatar_bg,
        email: row.email,
        ville: row.ville,
        eu: row.eu,
        likes: JSON.parse(row.likes || '[]')
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ posts }) };
    }

    // 4. SUPPRIMER UN POST (LE DESTRUCTEUR DE ZOMBIES 🧟‍♂️🔫)
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id) {
        await pool.end();
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID manquant' }) };
      }

      await pool.query('DELETE FROM posts WHERE id = $1', [body.id]);
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // Si on arrive ici, c'est une méthode bizarre
    await pool.end();
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  } catch (err) {
    console.error('posts error:', err.message);
    try { await pool.end(); } catch(e) {}
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
