// Sends the license key by email via Resend. No-ops silently if Resend
// isn't configured, since email delivery is optional per spec.
async function sendLicenseEmail({ to, licenseKey, expiresAt }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LICENSE_FROM_EMAIL;
  if (!apiKey || !from) {
    return { skipped: true };
  }

  const { Resend } = require('resend');
  const resend = new Resend(apiKey);
  const expiresDate = expiresAt.toISOString().slice(0, 10);

  await resend.emails.send({
    from,
    to,
    subject: 'Votre licence EU Compliance Suite',
    text: [
      'Merci pour votre achat de la licence EU Compliance Suite.',
      '',
      `Clé de licence : ${licenseKey}`,
      `Valable jusqu'au : ${expiresDate}`,
      '',
      'Activez-la depuis les réglages de l\'extension Cmsight sur votre site WordPress.',
    ].join('\n'),
  });

  return { skipped: false };
}

// Cmsight app purchases don't generate an automatic license, but they do
// get a link to the customer portal (downloads + updates). Used both right
// after purchase and whenever the buyer asks to resend their access link.
async function sendAccessLinkEmail({ to, url, isNewPurchase }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LICENSE_FROM_EMAIL;
  if (!apiKey || !from) {
    return { skipped: true };
  }

  const { Resend } = require('resend');
  const resend = new Resend(apiKey);

  const intro = isNewPurchase
    ? 'Merci pour votre achat de Cmsight !'
    : "Voici votre lien d'accès à votre espace client Cmsight.";

  await resend.emails.send({
    from,
    to,
    subject: isNewPurchase ? 'Votre accès Cmsight' : 'Votre lien d\'accès Cmsight',
    text: [
      intro,
      '',
      'Accédez à vos téléchargements et aux mises à jour ici :',
      url,
      '',
      'Ce lien est valable 30 jours. Vous pourrez toujours en redemander un nouveau depuis la page "Mon espace" du site.',
    ].join('\n'),
  });

  return { skipped: false };
}

module.exports = { sendLicenseEmail, sendAccessLinkEmail };
