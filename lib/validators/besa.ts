import { z } from "zod";

/**
 * Validateurs Zod pour les besas et leurs primitives.
 * Sources de vérité partagées entre Server Actions, route handlers et formulaires.
 */

export const titleSchema = z
  .string()
  .trim()
  .min(3, "Au moins 3 caractères")
  .max(200, "Maximum 200 caractères");

export const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "Maximum 2 000 caractères");

export const weightSchema = z
  .number({ message: "Poids invalide" })
  .int("Poids entier requis")
  .min(1, "Minimum 1")
  .max(10, "Maximum 10");

/**
 * Deadline : ISO 8601 datetime, doit être dans le futur (au moins 1 minute).
 * Le `refine` est volontairement souple — on tolère qu'on soit juste à l'heure
 * où on submit. La vérification stricte est faite côté serveur.
 */
export const deadlineSchema = z
  .string()
  .min(1, "Échéance requise")
  .refine((iso) => !Number.isNaN(Date.parse(iso)), "Date invalide")
  .refine((iso) => new Date(iso).getTime() > Date.now() + 60_000, "L'échéance doit être dans le futur");

export const createBesaSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional().default(""),
  deadline: deadlineSchema,
  weight_ressenti: weightSchema,
});

export type CreateBesaInput = z.infer<typeof createBesaSchema>;

export const signBesaSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9]{12}$/, "Token invalide"),
  weight_ressenti: weightSchema,
});

export type SignBesaInput = z.infer<typeof signBesaSchema>;

/**
 * Décrit un poids ressenti côté UI : niveau + label.
 * Utilisé pour les labels du curseur (1 = Anodin, 10 = Sacré).
 */
export const WEIGHT_ANCHORS = {
  1: "Anodin",
  5: "Engageant",
  10: "Sacré",
} as const;

export function weightLabel(weight: number): string {
  if (weight <= 2) return "Anodin";
  if (weight <= 4) return "Léger";
  if (weight <= 6) return "Engageant";
  if (weight <= 8) return "Important";
  return "Sacré";
}
