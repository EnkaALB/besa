import { describe, it, expect } from "vitest";

import { generateInviteToken, isValidTokenFormat, TOKEN_LENGTH } from "./invite";

describe("generateInviteToken", () => {
  it("returns exactly 12 characters", () => {
    expect(generateInviteToken()).toHaveLength(TOKEN_LENGTH);
  });

  it("only contains base62 characters", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateInviteToken()).toMatch(/^[A-Za-z0-9]{12}$/);
    }
  });

  it("produces statistically unique tokens (no collision in 10k samples)", () => {
    const samples = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      samples.add(generateInviteToken());
    }
    expect(samples.size).toBe(10_000);
  });

  it("uses roughly uniform distribution of characters", () => {
    // On échantillonne et on vérifie qu'au moins 80 % des caractères de l'alphabet
    // apparaissent dans 10 000 tokens (preuve grossière qu'on ne génère pas que des 'A').
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      for (const ch of generateInviteToken()) seen.add(ch);
    }
    expect(seen.size).toBeGreaterThanOrEqual(50); // alphabet a 62 chars
  });
});

describe("isValidTokenFormat", () => {
  it("accepts a generated token", () => {
    expect(isValidTokenFormat(generateInviteToken())).toBe(true);
  });

  it("accepts hand-crafted valid tokens", () => {
    expect(isValidTokenFormat("ABCdef123XYZ")).toBe(true);
    expect(isValidTokenFormat("000000000000")).toBe(true);
    expect(isValidTokenFormat("aaaaaaaaaaaa")).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidTokenFormat("short")).toBe(false);
    expect(isValidTokenFormat("a".repeat(11))).toBe(false);
    expect(isValidTokenFormat("a".repeat(13))).toBe(false);
    expect(isValidTokenFormat("")).toBe(false);
  });

  it("rejects non-base62 characters", () => {
    expect(isValidTokenFormat("ABCdef123XY-")).toBe(false); // dash
    expect(isValidTokenFormat("ABCdef123XY ")).toBe(false); // space
    expect(isValidTokenFormat("ABCdef123XY/")).toBe(false); // slash
    expect(isValidTokenFormat("ABCdef123XY!")).toBe(false); // special
    expect(isValidTokenFormat("ABCdef123XYé")).toBe(false); // accent
  });
});
