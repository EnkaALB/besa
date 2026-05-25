import { describe, it, expect } from "vitest";

import {
  createBesaSchema,
  deadlineSchema,
  descriptionSchema,
  signBesaSchema,
  titleSchema,
  weightLabel,
  weightSchema,
} from "./besa";

const FUTURE_ISO = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); // +30 j
const PAST_ISO = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // -1 j

describe("titleSchema", () => {
  it("accepts 3-200 chars", () => {
    expect(titleSchema.safeParse("abc").success).toBe(true);
    expect(titleSchema.safeParse("a".repeat(200)).success).toBe(true);
  });

  it("rejects too short / too long", () => {
    expect(titleSchema.safeParse("ab").success).toBe(false);
    expect(titleSchema.safeParse("").success).toBe(false);
    expect(titleSchema.safeParse("a".repeat(201)).success).toBe(false);
  });

  it("trims whitespace", () => {
    const r = titleSchema.safeParse("  Mon engagement  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("Mon engagement");
  });
});

describe("descriptionSchema", () => {
  it("accepts empty (optional)", () => {
    expect(descriptionSchema.safeParse("").success).toBe(true);
  });

  it("accepts up to 2000 chars", () => {
    expect(descriptionSchema.safeParse("a".repeat(2000)).success).toBe(true);
  });

  it("rejects > 2000 chars", () => {
    expect(descriptionSchema.safeParse("a".repeat(2001)).success).toBe(false);
  });
});

describe("weightSchema", () => {
  it("accepts 1-10 integers", () => {
    for (let w = 1; w <= 10; w++) {
      expect(weightSchema.safeParse(w).success).toBe(true);
    }
  });

  it("rejects out of range", () => {
    expect(weightSchema.safeParse(0).success).toBe(false);
    expect(weightSchema.safeParse(11).success).toBe(false);
    expect(weightSchema.safeParse(-1).success).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(weightSchema.safeParse(5.5).success).toBe(false);
  });

  it("rejects non-numbers", () => {
    expect(weightSchema.safeParse("5").success).toBe(false);
    expect(weightSchema.safeParse(null).success).toBe(false);
  });
});

describe("deadlineSchema", () => {
  it("accepts future ISO datetime (> 1 min)", () => {
    expect(deadlineSchema.safeParse(FUTURE_ISO).success).toBe(true);
  });

  it("rejects past dates", () => {
    expect(deadlineSchema.safeParse(PAST_ISO).success).toBe(false);
  });

  it("rejects empty / invalid strings", () => {
    expect(deadlineSchema.safeParse("").success).toBe(false);
    expect(deadlineSchema.safeParse("not-a-date").success).toBe(false);
  });

  it("rejects dates within next minute (anti-instant)", () => {
    const tooSoon = new Date(Date.now() + 10_000).toISOString();
    expect(deadlineSchema.safeParse(tooSoon).success).toBe(false);
  });
});

describe("createBesaSchema", () => {
  it("accepts complete valid input", () => {
    const r = createBesaSchema.safeParse({
      title: "Tenir ma parole",
      description: "Détail.",
      deadline: FUTURE_ISO,
      weight_ressenti: 7,
    });
    expect(r.success).toBe(true);
  });

  it("accepts without description (default empty)", () => {
    const r = createBesaSchema.safeParse({
      title: "Tenir ma parole",
      deadline: FUTURE_ISO,
      weight_ressenti: 5,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBe("");
  });

  it("rejects invalid title", () => {
    const r = createBesaSchema.safeParse({
      title: "ab",
      deadline: FUTURE_ISO,
      weight_ressenti: 5,
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid weight", () => {
    const r = createBesaSchema.safeParse({
      title: "Tenir ma parole",
      deadline: FUTURE_ISO,
      weight_ressenti: 11,
    });
    expect(r.success).toBe(false);
  });
});

describe("signBesaSchema", () => {
  it("accepts valid 12-char base62 token + weight", () => {
    const r = signBesaSchema.safeParse({
      token: "ABCdef123XYZ",
      weight_ressenti: 8,
    });
    expect(r.success).toBe(true);
  });

  it("rejects bad token format", () => {
    expect(signBesaSchema.safeParse({ token: "short", weight_ressenti: 5 }).success).toBe(false);
    expect(signBesaSchema.safeParse({ token: "ABCdef123XY!", weight_ressenti: 5 }).success).toBe(false);
  });
});

describe("weightLabel", () => {
  it("returns ascending labels", () => {
    expect(weightLabel(1)).toBe("Anodin");
    expect(weightLabel(2)).toBe("Anodin");
    expect(weightLabel(3)).toBe("Léger");
    expect(weightLabel(5)).toBe("Engageant");
    expect(weightLabel(7)).toBe("Important");
    expect(weightLabel(10)).toBe("Sacré");
  });
});
