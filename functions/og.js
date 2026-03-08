const { Pool } = require('pg');

exports.handler = async (event) => {
  const postId = event.queryStringParameters?.id;

  if (!postId) {
    return { statusCode: 302, headers: { Location: 'https://bookshare.fr' } };
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
    await pool.end();

    if (result.rows.length === 0) {
      return { statusCode: 302, headers: { Location: 'https://bookshare.fr' } };
    }

    const p = result.rows[0];
    const titre = p.titre || 'Publication BookShare';
    const auteur = p.auteur || '';
    const texte = (p.texte || '').substring(0, 160) + '...';
    const type = p.type || 'livre';
    const icons = { livre: '📚', film: '🎬', serie: '📺', musique: '🎵', these: '🎓', presse: '📰' };
    const icon = icons[type] || '📚';
    const description = `${icon} ${auteur} partage sur BookShare : "${texte}"`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${titre} — BookShare">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://bookshare.fr/og-image.png">
  <meta property="og:url" content="https://bookshare.fr/post/${postId}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="BookShare">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${titre} — BookShare">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://bookshare.fr/og-image.png">
  <meta http-equiv="refresh" content="0;url=https://bookshare.fr?post=${postId}">
  <script>window.location.href = 'https://bookshare.fr?post=${postId}';</script>
</head>
<body>Redirection...</body>
</html>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html
    };

  } catch (err) {
    await pool.end().catch(() => {});
    return { statusCode: 302, headers: { Location: 'https://bookshare.fr' } };
  }
};
