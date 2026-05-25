import { randomBytes } from "node:crypto";

/**
 * Génération d'un token d'invitation pour les besas.
 *
 * Format : 12 caractères base62 (a-z, A-Z, 0-9) = 62^12 ≈ 3.2 × 10^21 combinaisons (~71 bits).
 * Source d'aléa : `crypto.randomBytes` (CSPRNG) — jamais `Math.random`.
 *
 * Utilisé pour `besas.app/b/{token}`. Stocké dans `besa_invites.token` (PK).
 * Expiration : 7 jours. Usage : unique (RPC `consume_invite` marque `used_at`).
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const TOKEN_LENGTH = 12;
export const TOKEN_REGEX = /^[A-Za-z0-9]{12}$/;

export function generateInviteToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  return Array.from(bytes, (b) => ALPHABET.charAt(b % ALPHABET.length)).join("");
}

export function isValidTokenFormat(token: string): boolean {
  return TOKEN_REGEX.test(token);
}
