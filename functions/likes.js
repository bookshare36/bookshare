const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  if (event.httpMethod === 'GET') {
    const { postId, userEmail } = event.queryStringParameters;
    const rows = await sql`SELECT * FROM likes WHERE post_id=${postId} AND user_email=${userEmail}`;
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ liked: rows.length > 0 }) };
  }

  if (event.httpMethod === 'POST') {
    const { postId, userEmail, action } = JSON.parse(event.body);
    if (action === 'unlike') {
      await sql`DELETE FROM likes WHERE post_id=${postId} AND user_email=${userEmail}`;
    } else {
      await sql`INSERT INTO likes (post_id, user_email) VALUES (${postId}, ${userEmail}) ON CONFLICT DO NOTHING`;
    }
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
