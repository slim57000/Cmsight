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

// Cmsight app purchases don't generate an automatic license — this just
// confirms the payment and sets expectations for manual follow-up.
async function sendPurchaseConfirmationEmail({ to }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LICENSE_FROM_EMAIL;
  if (!apiKey || !from) {
    return { skipped: true };
  }

  const { Resend } = require('resend');
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: 'Confirmation de votre achat Cmsight',
    text: [
      'Merci pour votre achat de la licence Cmsight.',
      '',
      'Nous vous recontacterons très prochainement par email pour finaliser l\'activation de votre licence.',
    ].join('\n'),
  });

  return { skipped: false };
}

module.exports = { sendLicenseEmail, sendPurchaseConfirmationEmail };
