/**
 * Template email envoyé au créateur quand le cosigner vient de signer sa besa.
 * HTML inline (compatible Gmail / Outlook / mobile clients).
 */

interface CosignerSignedData {
  creatorName: string;
  cosignerName: string;
  title: string;
  description: string | null;
  creatorWeight: number;
  cosignerWeight: number;
  weightFinal: number;
  deadline: string; // ISO
  besaUrl: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function cosignerSignedEmail(data: CosignerSignedData): EmailContent {
  const subject = `${data.cosignerName} a scellé ta besa`;
  const deadlineFr = formatDeadline(data.deadline);
  const safeTitle = escapeHtml(data.title);
  const safeCosigner = escapeHtml(data.cosignerName);
  const safeCreator = escapeHtml(data.creatorName);

  const text = `${data.cosignerName} a signé la besa que tu lui as proposée :

  "${data.title}"

Échéance : ${deadlineFr}

Ton poids : ${data.creatorWeight}
Son poids : ${data.cosignerWeight}
Poids final : ${data.weightFinal.toFixed(1)}

Voir la besa : ${data.besaUrl}

À l'échéance, tu seras invité à valider si elle a été tenue.

— Besa`;

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Arial,sans-serif;color:#0A0A0A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF7;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#FFFFFF;border:1px solid #EEEEE7;border-radius:8px;padding:48px 32px;">
          <tr>
            <td align="center">
              <div style="height:1px;width:48px;background:#8B0000;margin:0 auto 32px;"></div>
              <p style="margin:0 0 24px;font-size:11px;text-transform:uppercase;letter-spacing:0.3em;color:#666;">Besa scellée</p>
              <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#0A0A0A;">
                ${safeCreator}, <strong>${safeCosigner}</strong> a signé la besa que tu lui as proposée.
              </p>
              <h1 style="margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;font-weight:300;font-size:28px;line-height:1.2;color:#0A0A0A;">
                ${safeTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td width="48%" align="center" style="padding:16px;border:1px solid #EEEEE7;border-radius:6px;background:#FAFAF7;">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#666;">Toi</p>
                    <p style="margin:8px 0 4px;font-family:Georgia,serif;font-size:36px;color:#0A0A0A;">${data.creatorWeight}</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" align="center" style="padding:16px;border:1px solid #EEEEE7;border-radius:6px;background:#FAFAF7;">
                    <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#666;">${safeCosigner}</p>
                    <p style="margin:8px 0 4px;font-family:Georgia,serif;font-size:36px;color:#0A0A0A;">${data.cosignerWeight}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 0;border-top:1px solid #EEEEE7;">
              <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#666;">Poids final</p>
              <p style="margin:8px 0 0;font-family:Georgia,serif;font-size:48px;color:#8B0000;">${data.weightFinal.toFixed(1)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:32px;">
              <a href="${escapeHtml(data.besaUrl)}" style="display:inline-block;background:#0A0A0A;color:#FAFAF7;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
                Voir la besa
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:12px;color:#666;line-height:1.6;">
                Échéance : <span style="color:#0A0A0A;">${escapeHtml(deadlineFr)}</span><br>
                À cette date, vous serez tous les deux invités à valider si elle a été tenue.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:11px;color:#999;">— Besa</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
