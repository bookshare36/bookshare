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
