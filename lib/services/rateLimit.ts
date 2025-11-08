import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!env.UPSTASH_RATELIMIT_REST_URL || !env.UPSTASH_RATELIMIT_REST_TOKEN) {
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_RATELIMIT_REST_URL,
      token: env.UPSTASH_RATELIMIT_REST_TOKEN,
    });
  }

  return redis;
}

export async function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean = false
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const redisInstance = getRedis();

  if (!redisInstance) {
    // If Upstash is not configured, allow all requests
    return { success: true, limit: 1000, remaining: 999, reset: Date.now() + 3600000 };
  }

  // Anonymous: 5 searches/hour, Authenticated: 50 searches/hour
  const limit = isAuthenticated ? 50 : 5;

  // Create a rate limiter with the specific limit
  const ratelimit = new Ratelimit({
    redis: redisInstance,
    limiter: Ratelimit.slidingWindow(limit, "1 h"),
    analytics: true,
  });

  const result = await ratelimit.limit(identifier);

  return {
    success: result.success,
    limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

