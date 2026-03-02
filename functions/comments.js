const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  if (event.httpMethod === 'GET') {
    const { postId } = event.queryStringParameters;
    const comments = await sql`SELECT * FROM comments WHERE post_id=${postId} ORDER BY created_at ASC`;
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(comments) };
  }

  if (event.httpMethod === 'POST') {
    const { postId, userEmail, userPrenom, userNom, text } = JSON.parse(event.body);
    await sql`INSERT INTO comments (post_id, user_email, user_prenom, user_nom, text, created_at)
      VALUES (${postId}, ${userEmail}, ${userPrenom}, ${userNom}, ${text}, NOW())`;
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod === 'DELETE') {
    const { id } = JSON.parse(event.body);
    await sql`DELETE FROM comments WHERE id=${id}`;
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
