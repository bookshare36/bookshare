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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id             TEXT PRIMARY KEY,
        type           TEXT,
        titre          TEXT,
        meta           TEXT,
        texte          TEXT,
        type_badge     TEXT,
        specific_metas TEXT,
        note           INTEGER DEFAULT 0,
        ts             BIGINT,
        auteur         TEXT,
        initials       TEXT,
        avatar_bg      TEXT,
        avatar_photo   TEXT,
        email          TEXT,
        ville          TEXT,
        eu             INTEGER DEFAULT 0,
        likes          TEXT DEFAULT '[]',
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Ajouter colonnes manquantes si table existait déjà
    const alterCols = [
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS ts BIGINT`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS type TEXT`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS type_badge TEXT`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS specific_metas TEXT`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS note INTEGER DEFAULT 0`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS initials TEXT`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS avatar_bg TEXT`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS avatar_photo TEXT`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS ville TEXT`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS eu INTEGER DEFAULT 0`,
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes TEXT DEFAULT '[]'`,
    ];
    for (const sql of alterCols) await pool.query(sql);

    // GET
    if (event.httpMethod === 'GET') {
      const result = await pool.query(
        'SELECT * FROM posts ORDER BY ts DESC NULLS LAST LIMIT 100'
      );
      await pool.end();
      const posts = result.rows.map(r => ({
        id: r.id,
        type: r.type,
        titre: r.titre,
        meta: r.meta,
        texte: r.texte,
        typeBadge: r.type_badge,
        specificMetas: JSON.parse(r.specific_metas || '[]'),
        note: r.note || 0,
        ts: Number(r.ts) || 0,
        auteur: r.auteur,
        initials: r.initials,
        avatarBg: r.avatar_bg,
        avatarPhoto: r.avatar_photo || null,
        email: r.email,
        ville: r.ville,
        eu: r.eu || 0,
        likes: JSON.parse(r.likes || '[]'),
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ posts }) };
    }

    // POST
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const p = body.post;
      if (!p || !p.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'post requis' }) };

      await pool.query(`
        INSERT INTO posts (id, type, titre, meta, texte, type_badge, specific_metas, note, ts, auteur, initials, avatar_bg, avatar_photo, email, ville, eu, likes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id, p.type||'livre', p.titre||'', p.meta||'', p.texte||'',
        p.typeBadge||'', JSON.stringify(p.specificMetas||[]),
        p.note||0, p.ts||Date.now(),
        p.auteur||'', p.initials||'', p.avatarBg||'',
        p.avatarPhoto||null,
        p.email||'', p.ville||'',
        p.eu||0, JSON.stringify(p.likes||[])
      ]);

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // DELETE
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id requis' }) };
      await pool.query('DELETE FROM posts WHERE id = $1', [body.id]);
      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    await pool.end();
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  } catch (err) {
    console.error('posts error:', err.message);
    await pool.end().catch(()=>{});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
