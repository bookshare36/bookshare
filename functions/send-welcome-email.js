const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { email, prenom } = JSON.parse(event.body);
    if (!email || !prenom) {
      return { statusCode: 200, body: JSON.stringify({ success: false, reason: 'missing fields' }) };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'BookShare <noreply@bookshare.fr>',
      to: email,
      subject: 'Bienvenue chez Bookshare ! 📚 Votre accès au savoir partagé commence ici.',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:30px 20px;background:#fff;">
          
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#C8882A;font-size:28px;margin:0;">📚 BookShare</h1>
            <p style="color:#888;font-size:12px;margin:4px 0 0;">Le savoir partagé, humblement.</p>
          </div>

          <h2 style="color:#1A0A00;font-size:20px;margin-bottom:6px;">Bonjour ${prenom},</h2>
          <h3 style="color:#C8882A;font-size:16px;font-weight:600;margin-bottom:16px;">Votre accès au savoir partagé commence ici</h3>

          <p style="color:#333;line-height:1.7;margin-bottom:12px;">
            <strong>Bravo, vous venez de rejoindre la communauté Bookshare !</strong>
          </p>

          <p style="color:#555;line-height:1.7;margin-bottom:20px;">
            Désormais, vos étagères ne dorment plus : elles s'ouvrent au monde. Vous venez d'accéder à une bibliothèque infinie et collaborative.
          </p>

          <div style="background:#FFF8EE;border-left:4px solid #C8882A;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="color:#1A0A00;font-weight:700;margin:0 0 12px;">Voici vos 3 premières étapes pour bien démarrer :</p>
            <p style="color:#555;margin:0 0 10px;line-height:1.6;">
              📸 <strong>Complétez votre profil :</strong> Ajoutez une photo pour rassurer les autres lecteurs.
            </p>
            <p style="color:#555;margin:0 0 10px;line-height:1.6;">
              📖 <strong>Partagez votre premier livre :</strong> Libérez une pépite de votre bibliothèque.
            </p>
            <p style="color:#555;margin:0;line-height:1.6;">
              ⚡ <strong>Donnez un Eurêka</strong> au résumé qui vous plaît !
            </p>
          </div>

          <p style="color:#555;line-height:1.7;margin-bottom:24px;">
            On a hâte de voir quelle sera votre première trouvaille !
          </p>

          <div style="text-align:center;margin-bottom:28px;">
            <a href="https://bookshare.fr" style="display:inline-block;background:linear-gradient(135deg,#C8882A,#FFD700);color:#1A0A00;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px;">
              Commencer maintenant →
            </a>
          </div>

          <hr style="border:none;border-top:1px solid #eee;margin-bottom:16px;">

          <p style="color:#555;line-height:1.7;margin:0;">
            À très vite sur Bookshare,<br>
            <strong>L'équipe Bookshare</strong>
          </p>
          <p style="color:#C8882A;font-style:italic;font-size:13px;margin-top:8px;">
            Le savoir partagé, humblement !
          </p>

        </div>
      `
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Email error:', error);
    return { statusCode: 200, body: JSON.stringify({ success: false, reason: error.message }) };
  }
};
