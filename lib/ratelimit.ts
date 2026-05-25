import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting via Upstash Redis (free tier : 10k commandes/jour).
 *
 * Si UPSTASH_REDIS_REST_URL/TOKEN ne sont pas configurés, le limiteur retourne
 * { ok: true } systématiquement (graceful degradation en dev).
 *
 * Tiers :
 *   - "fast"   : 30 req / 1 min (lectures, vérifications de dispo)
 *   - "strict" : 5  req / 1 min (export RGPD, suppression, opérations sensibles)
 */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

let limiterFast: Ratelimit | null = null;
let limiterStrict: Ratelimit | null = null;

if (redisUrl && redisToken) {
  const redis = new Redis({ url: redisUrl, token: redisToken });

  limiterFast = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "besa:rl:fast",
    analytics: false,
  });

  limiterStrict = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "besa:rl:strict",
    analytics: false,
  });
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  reset: number; // epoch ms
};

export async function checkRateLimit(
  identifier: string,
  tier: "fast" | "strict",
): Promise<RateLimitResult> {
  const limiter = tier === "fast" ? limiterFast : limiterStrict;

  if (!limiter) {
    return { ok: true, remaining: 999, reset: Date.now() + 60_000 };
  }

  const { success, remaining, reset } = await limiter.limit(identifier);
  return { ok: success, remaining, reset };
}

export function isRateLimitConfigured(): boolean {
  return Boolean(redisUrl && redisToken);
}
