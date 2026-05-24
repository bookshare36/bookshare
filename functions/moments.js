const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Créer la table si elle n'existe pas
async function ensureTable(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS moments (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      prenom     TEXT,
      nom        TEXT,
      initials   TEXT,
      avatarbg   TEXT,
      photo      TEXT,
      type       TEXT NOT NULL,
      titre      TEXT NOT NULL,
      lieu       TEXT,
      mood       TEXT,
      ts         BIGINT NOT NULL,
      expires_at BIGINT NOT NULL
    );
  `);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  await ensureTable();
  const now = Date.now();

  // POST — sauvegarder un moment (un seul par utilisateur, remplace l'ancien)
  if (event.httpMethod === 'POST') {
    try {
      const m = JSON.parse(event.body);
      if (!m.userId || !m.titre || !m.type) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Données manquantes' }) };
      }

      // Supprimer l'ancien moment de cet utilisateur
      await pool.query('DELETE FROM moments WHERE user_id = $1', [m.userId]);

      // Insérer le nouveau
      await pool.query(`
        INSERT INTO moments (id, user_id, prenom, nom, initials, avatarbg, photo, type, titre, lieu, mood, ts, expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [
        m.id, m.userId, m.prenom||null, m.nom||null, m.initials||null,
        m.avatarBg||m.avatarbg||null, m.photo||null,
        m.type, m.titre, m.lieu||null, m.mood||null,
        m.ts, m.expiresAt||m.expiresat||(now + 86400000)
      ]);

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch(e) {
      console.error('moments POST:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // GET — récupérer tous les moments non expirés
  if (event.httpMethod === 'GET') {
    try {
      // Nettoyer les moments expirés au passage
      await pool.query('DELETE FROM moments WHERE expires_at < $1', [now]);

      const result = await pool.query(
        'SELECT * FROM moments WHERE expires_at > $1 ORDER BY ts DESC',
        [now]
      );

      // Renommer expires_at → expiresAt pour le frontend
      const rows = result.rows.map(r => ({
        id:        r.id,
        userId:    r.user_id,
        prenom:    r.prenom,
        nom:       r.nom,
        initials:  r.initials,
        avatarBg:  r.avatarbg,
        photo:     r.photo,
        type:      r.type,
        titre:     r.titre,
        lieu:      r.lieu,
        mood:      r.mood,
        ts:        parseInt(r.ts),
        expiresAt: parseInt(r.expires_at)
      }));

      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    } catch(e) {
      console.error('moments GET:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
