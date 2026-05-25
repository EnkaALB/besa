import { describe, it, expect } from "vitest";

import { cosignerSignedEmail } from "./cosigner-signed";

const baseInput = {
  creatorName: "Enkel",
  cosignerName: "Marie Dupont",
  title: "Rendre le manuscrit",
  description: null,
  creatorWeight: 8,
  cosignerWeight: 7,
  weightFinal: 7.5,
  deadline: "2026-12-01T18:00:00.000Z",
  besaUrl: "https://besa-six.vercel.app/besa/abc-123",
};

describe("cosignerSignedEmail", () => {
  it("returns subject including cosigner name", () => {
    const { subject } = cosignerSignedEmail(baseInput);
    expect(subject).toContain("Marie Dupont");
    expect(subject).toContain("scellé");
  });

  it("includes title and both weights in text fallback", () => {
    const { text } = cosignerSignedEmail(baseInput);
    expect(text).toContain("Rendre le manuscrit");
    expect(text).toContain("Ton poids : 8");
    expect(text).toContain("Son poids : 7");
    expect(text).toContain("Poids final : 7.5");
  });

  it("includes besaUrl in both text and html", () => {
    const { text, html } = cosignerSignedEmail(baseInput);
    expect(text).toContain("https://besa-six.vercel.app/besa/abc-123");
    expect(html).toContain("https://besa-six.vercel.app/besa/abc-123");
  });

  it("escapes HTML in user-controlled fields", () => {
    const { html } = cosignerSignedEmail({
      ...baseInput,
      title: "<script>alert('xss')</script>",
      cosignerName: "Eve & Bob",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Eve &amp; Bob");
  });

  it("renders weight_final with one decimal", () => {
    const { html, text } = cosignerSignedEmail({ ...baseInput, weightFinal: 6 });
    expect(html).toContain("6.0");
    expect(text).toContain("6.0");
  });

  it("formats deadline in French", () => {
    const { text } = cosignerSignedEmail(baseInput);
    // Le format exact varie selon le runtime, on vérifie au moins que c'est en FR
    expect(text).toMatch(/d[éeè]cembre|nov|jan/i);
  });
});
