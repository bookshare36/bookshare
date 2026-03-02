const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { amount, description, listingId, buyerEmail } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: description || 'Coordonnées vendeur BookShare',
          },
          unit_amount: amount || 100, // 1€ en centimes
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: process.env.URL + '?shop_success=' + listingId,
      cancel_url: process.env.URL + '?shop_cancel=1',
      customer_email: buyerEmail,
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ id: session.id }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
