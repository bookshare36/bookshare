const { Pool } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Création de la table (Ce que tu avais déjà)
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

    // 2. ENREGISTRER UN NOUVEAU POST (La partie qui manquait !)
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const p = body.post; // C'est la boîte _pendingPost envoyée par index.html

      if (!p || !p.id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Post invalide' }) };
      }

      // On insère les données du post dans les colonnes Neon
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

    // 3. LIRE TOUS LES POSTS (L'autre partie qui manquait !)
    if (event.httpMethod === 'GET') {
      const result = await pool.query('SELECT * FROM posts ORDER BY ts DESC LIMIT 100');
      await pool.end();
      
      // On prépare les posts pour que index.html les lise parfaitement
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

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  } catch (err) {
    console.error('posts error:', err.message);
    await pool.end().catch(() => {});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
