// ═══ NETLIFY FUNCTION: send-welcome-email.js ═══
// Envoie l'email de bienvenue à l'inscription via Resend
// Variable d'env requise : RESEND_API_KEY

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  const { prenom, email } = JSON.parse(event.body || '{}');
  if (!prenom || !email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'prenom et email requis' }) };

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, reason: 'RESEND_API_KEY non configurée' }) };
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1A0A00,#3A2000);padding:36px 32px;text-align:center;">
      <div style="font-size:44px;margin-bottom:10px;">📚</div>
      <div style="font-family:Georgia,serif;font-size:28px;font-weight:900;color:#ffffff;">Book<em style="color:#FFD700;">Share</em></div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);letter-spacing:0.14em;text-transform:uppercase;margin-top:6px;">Le savoir partagé, humblement</div>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px;">
      <p style="font-size:16px;color:#2C2C2C;margin:0 0 20px;">Bonjour <strong>${prenom}</strong>,</p>

      <h2 style="font-family:Georgia,serif;font-size:19px;color:#C8882A;margin:0 0 16px;font-weight:700;">
        📚 Votre accès au savoir partagé commence ici
      </h2>

      <p style="font-size:14px;color:#333;line-height:1.75;margin:0 0 10px;">
        <strong>Bravo, vous venez de rejoindre la communauté mykoinon !</strong>
      </p>
      <p style="font-size:14px;color:#555;line-height:1.75;margin:0 0 26px;">
        Désormais, vos étagères ne dorment plus : elles s'ouvrent au monde.<br>
        Vous venez d'accéder à une bibliothèque infinie et collaborative.
      </p>

      <!-- 3 étapes -->
      <div style="background:#faf6ee;border-radius:12px;padding:24px 26px;margin-bottom:28px;border-left:4px solid #FFD700;">
        <p style="font-size:14px;font-weight:700;color:#1A0A00;margin:0 0 18px;">Voici vos 3 premières étapes pour bien démarrer :</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr>
            <td width="34" valign="top">
              <div style="background:#FFD700;color:#1A0A00;font-weight:800;font-size:12px;width:26px;height:26px;border-radius:50%;text-align:center;line-height:26px;">1</div>
            </td>
            <td valign="top" style="padding-left:10px;">
              <p style="font-size:14px;color:#2C2C2C;margin:0 0 3px;"><strong>Complétez votre profil</strong></p>
              <p style="font-size:13px;color:#666;margin:0;">Ajoutez une petite photo pour rassurer les autres lecteurs.</p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr>
            <td width="34" valign="top">
              <div style="background:#FFD700;color:#1A0A00;font-weight:800;font-size:12px;width:26px;height:26px;border-radius:50%;text-align:center;line-height:26px;">2</div>
            </td>
            <td valign="top" style="padding-left:10px;">
              <p style="font-size:14px;color:#2C2C2C;margin:0 0 3px;"><strong>Partagez votre premier livre</strong></p>
              <p style="font-size:13px;color:#666;margin:0;">Libérez une pépite de votre bibliothèque.</p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="34" valign="top">
              <div style="background:#FFD700;color:#1A0A00;font-weight:800;font-size:12px;width:26px;height:26px;border-radius:50%;text-align:center;line-height:26px;">3</div>
            </td>
            <td valign="top" style="padding-left:10px;">
              <p style="font-size:14px;color:#2C2C2C;margin:0 0 3px;"><strong>Donnez un Eurêka ⚡</strong></p>
              <p style="font-size:13px;color:#666;margin:0;">N'hésitez pas à donner un Eurêka au résumé qui vous plaît.</p>
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size:14px;color:#555;line-height:1.75;margin:0 0 28px;">
        On a hâte de voir quelle sera votre première trouvaille ! 🌟
      </p>

      <div style="text-align:center;">
        <a href="https://mykoinon.fr" style="display:inline-block;background:linear-gradient(135deg,#C8882A,#FFD700);color:#1A0A00;font-weight:800;font-size:15px;padding:15px 36px;border-radius:12px;text-decoration:none;">
          Accéder à mykoinon →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#faf6ee;padding:24px 32px;border-top:1px solid #e8e0d0;text-align:center;">
      <p style="font-size:13px;color:#666;margin:0 0 4px;">À très vite sur mykoinon,</p>
      <p style="font-size:14px;font-weight:700;color:#1A0A00;margin:0 0 8px;">L'équipe mykoinon</p>
      <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#C8882A;margin:0;">Le savoir partagé, humblement !</p>
    </div>

  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'mykoinon <noreply@mykoinon.fr>',
        to: [email],
        subject: 'Bienvenue chez mykoinon 📚',
        html,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('[WELCOME] Envoyé à', email);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } else {
      console.error('[WELCOME] Erreur:', data);
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: data.message }) };
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
