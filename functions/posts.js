const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  if (event.httpMethod === 'GET') {
    const posts = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(posts) };
  }

  if (event.httpMethod === 'POST') {
    const data = JSON.parse(event.body);
    await sql`INSERT INTO posts (id, user_email, titre, meta, type, reflexion, citation, tags, stars, eu, created_at)
      VALUES (${data.id}, ${data.userEmail}, ${data.titre}, ${data.meta}, ${data.type}, ${data.reflexion}, ${data.citation}, ${data.tags}, ${data.stars}, ${data.eu}, NOW())
      ON CONFLICT (id) DO NOTHING`;
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod === 'DELETE') {
    const { id } = JSON.parse(event.body);
    await sql`DELETE FROM posts WHERE id=${id}`;
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
