exports.handler = async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: null })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId })
  };
};
