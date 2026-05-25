import { z } from "zod";

export const USERNAME_REGEX = /^[a-z0-9_-]+$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Au moins 3 caractères")
  .max(30, "Maximum 30 caractères")
  .regex(USERNAME_REGEX, "Minuscules, chiffres, tirets et underscores uniquement");

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Ton nom est requis")
  .max(100, "Maximum 100 caractères");

export const bioSchema = z.string().trim().max(280, "Maximum 280 caractères");

export const avatarUrlSchema = z.string().url().nullable();

export const onboardingSchema = z.object({
  username: usernameSchema,
  full_name: fullNameSchema,
  bio: bioSchema.optional().default(""),
  avatar_url: avatarUrlSchema.optional().default(null),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/**
 * Suggère un username à partir du prénom/nom (ou de l'email en fallback).
 * Normalise : minuscules, accents enlevés, séparateurs en `-`.
 */
export function suggestUsername(seed: string): string {
  return seed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}
