const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        email      TEXT PRIMARY KEY,
        pwd        TEXT,
        nom        TEXT,
        prenom     TEXT,
        ville      TEXT,
        joined     TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const body = JSON.parse(event.body || '{}');

    // PUT — inscription
    if (event.httpMethod === 'PUT') {
      const { email, pwd, nom, prenom, ville, joined, google } = body;
      if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email requis' }) };

      // Hasher le mot de passe si fourni et pas déjà hashé
      let hashedPwd = null;
      if (pwd && pwd !== '__google__') {
        const alreadyHashed = pwd.startsWith('$2');
        hashedPwd = alreadyHashed ? pwd : await bcrypt.hash(pwd, 10);
      }

      await pool.query(`
        INSERT INTO users (email, pwd, nom, prenom, ville, joined, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (email) DO UPDATE SET
          pwd = COALESCE($2, users.pwd),
          nom = COALESCE($3, users.nom),
          prenom = COALESCE($4, users.prenom),
          ville = COALESCE($5, users.ville),
          updated_at = NOW()
      `, [email, hashedPwd, nom||null, prenom||null, ville||null, joined||new Date().toISOString()]);

      await pool.end();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // POST — connexion
    if (event.httpMethod === 'POST') {
      const { email, pwd, google } = body;
      if (!email || !pwd) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email et pwd requis' }) };

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      await pool.end();

      if (result.rows.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ error: 'not_found' }) };
      }

      const user = result.rows[0];

      // Connexion Google — pas de vérification de mot de passe
      if (google || pwd === '__google__') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            user: {
              email:  user.email,
              nom:    user.nom    || '',
              prenom: user.prenom || '',
              ville:  user.ville  || '',
              joined: user.joined,
            }
          })
        };
      }

      // Vérification mot de passe — bcrypt ou comparaison directe (migration)
      let pwdOk = false;
      if (user.pwd && user.pwd.startsWith('$2')) {
        // Mot de passe hashé
        pwdOk = await bcrypt.compare(pwd, user.pwd);
      } else {
        // Ancien mot de passe en clair — on accepte et on hashe pour la prochaine fois
        pwdOk = user.pwd === pwd;
        if (pwdOk && user.pwd) {
          const newHash = await bcrypt.hash(pwd, 10);
          const pool2 = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
          await pool2.query('UPDATE users SET pwd = $1 WHERE email = $2', [newHash, email]);
          await pool2.end();
        }
      }

      if (!pwdOk) {
        return { statusCode: 200, headers, body: JSON.stringify({ error: 'wrong_password' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          user: {
            email:  user.email,
            nom:    user.nom    || '',
            prenom: user.prenom || '',
            ville:  user.ville  || '',
            joined: user.joined,
          }
        })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Methode non autorisee' }) };

  } catch (err) {
    console.error('login-user error:', err.message);
    await pool.end().catch(()=>{});
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
