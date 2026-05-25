import { Resend } from "resend";

/**
 * Wrapper Resend avec graceful no-op si RESEND_API_KEY absent (utile en dev local).
 *
 * From : pour le MVP, on utilise `onboarding@resend.dev` (le domain par défaut Resend
 * qui ne nécessite pas de vérification). Limite : Resend free tier ne permet d'envoyer
 * QU'À l'email du compte Resend tant que le domain custom n'est pas vérifié.
 * À migrer vers `noreply@getbesa.app` une fois le domaine acheté + vérifié.
 */

const apiKey = process.env.RESEND_API_KEY;

let resend: Resend | null = null;
if (apiKey) {
  resend = new Resend(apiKey);
}

const DEFAULT_FROM = "Besa <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return resend !== null;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — email not sent.");
    return { ok: false, error: "Email service not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: input.from ?? DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (result.error) {
      console.error("[email] Resend error:", result.error);
      return { ok: false, error: result.error.message };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] Send threw:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
