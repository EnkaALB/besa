import { describe, it, expect } from "vitest";

import {
  bioSchema,
  fullNameSchema,
  onboardingSchema,
  suggestUsername,
  usernameSchema,
} from "./profile";

describe("usernameSchema", () => {
  it("accepts valid usernames", () => {
    expect(usernameSchema.safeParse("jean-dupont").success).toBe(true);
    expect(usernameSchema.safeParse("jean_d").success).toBe(true);
    expect(usernameSchema.safeParse("user42").success).toBe(true);
    expect(usernameSchema.safeParse("a-b_c").success).toBe(true);
    expect(usernameSchema.safeParse("abc").success).toBe(true); // 3 chars min
    expect(usernameSchema.safeParse("a".repeat(30)).success).toBe(true); // 30 max
  });

  it("rejects too short", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a").success).toBe(false);
    expect(usernameSchema.safeParse("").success).toBe(false);
  });

  it("rejects too long", () => {
    expect(usernameSchema.safeParse("a".repeat(31)).success).toBe(false);
  });

  it("rejects uppercase", () => {
    expect(usernameSchema.safeParse("Jean").success).toBe(false);
    expect(usernameSchema.safeParse("JEAN").success).toBe(false);
  });

  it("rejects accents", () => {
    expect(usernameSchema.safeParse("jéan").success).toBe(false);
    expect(usernameSchema.safeParse("françois").success).toBe(false);
  });

  it("rejects special characters", () => {
    expect(usernameSchema.safeParse("jean.dupont").success).toBe(false);
    expect(usernameSchema.safeParse("jean@dupont").success).toBe(false);
    expect(usernameSchema.safeParse("jean dupont").success).toBe(false);
    expect(usernameSchema.safeParse("jean!").success).toBe(false);
  });

  it("trims whitespace", () => {
    const result = usernameSchema.safeParse("  jean  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("jean");
    }
  });
});

describe("fullNameSchema", () => {
  it("accepts valid full names", () => {
    expect(fullNameSchema.safeParse("Jean Dupont").success).toBe(true);
    expect(fullNameSchema.safeParse("María José").success).toBe(true);
    expect(fullNameSchema.safeParse("J").success).toBe(true);
    expect(fullNameSchema.safeParse("a".repeat(100)).success).toBe(true);
  });

  it("rejects empty after trim", () => {
    expect(fullNameSchema.safeParse("").success).toBe(false);
    expect(fullNameSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects too long", () => {
    expect(fullNameSchema.safeParse("a".repeat(101)).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const result = fullNameSchema.safeParse("  Jean  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Jean");
    }
  });
});

describe("bioSchema", () => {
  it("accepts empty (zero-length after trim)", () => {
    expect(bioSchema.safeParse("").success).toBe(true);
    expect(bioSchema.safeParse("   ").success).toBe(true);
  });

  it("accepts up to 280 chars", () => {
    expect(bioSchema.safeParse("a".repeat(280)).success).toBe(true);
  });

  it("rejects > 280 chars", () => {
    expect(bioSchema.safeParse("a".repeat(281)).success).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("accepts complete valid input", () => {
    const result = onboardingSchema.safeParse({
      username: "jean-dupont",
      full_name: "Jean Dupont",
      bio: "Hello world.",
      avatar_url: "https://example.com/a.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal valid input (no bio, no avatar)", () => {
    const result = onboardingSchema.safeParse({
      username: "jean",
      full_name: "Jean",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBe("");
      expect(result.data.avatar_url).toBeNull();
    }
  });

  it("rejects if username invalid", () => {
    const result = onboardingSchema.safeParse({
      username: "Jean!",
      full_name: "Jean",
    });
    expect(result.success).toBe(false);
  });

  it("rejects if avatar_url is not a URL", () => {
    const result = onboardingSchema.safeParse({
      username: "jean",
      full_name: "Jean",
      avatar_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("suggestUsername", () => {
  it("lowercases", () => {
    expect(suggestUsername("JEAN")).toBe("jean");
  });

  it("strips accents", () => {
    expect(suggestUsername("Jéan Dupônt")).toBe("jean-dupont");
    expect(suggestUsername("françois")).toBe("francois");
  });

  it("replaces special chars with dashes", () => {
    expect(suggestUsername("jean.dupont")).toBe("jean-dupont");
    expect(suggestUsername("jean@example")).toBe("jean-example");
    expect(suggestUsername("jean dupont")).toBe("jean-dupont");
  });

  it("strips leading/trailing dashes", () => {
    expect(suggestUsername("--jean--")).toBe("jean");
    expect(suggestUsername("...jean...")).toBe("jean");
  });

  it("truncates to 30 chars", () => {
    expect(suggestUsername("a".repeat(100))).toHaveLength(30);
  });

  it("returns empty for pure noise", () => {
    expect(suggestUsername("@#$%")).toBe("");
  });

  it("preserves valid chars as-is", () => {
    expect(suggestUsername("jean-dupont_42")).toBe("jean-dupont_42");
  });
});
