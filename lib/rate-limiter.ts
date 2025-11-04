import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
} from "rate-limiter-flexible";
import Redis from "ioredis";
import { getConfig } from "./config";
import type { RateLimitResult } from "./types";

type Limiter = RateLimiterMemory | RateLimiterRedis;

function createRateLimiter(maxRequests: number, windowMs: number) {
  let limiter: Limiter;
  let usingRedis = false;
  let fallbackPromise: Promise<void> | null = null;
  const windowSeconds = Math.ceil(windowMs / 1000);

  const createMemoryLimiter = () =>
    new RateLimiterMemory({
      points: maxRequests,
      duration: windowSeconds,
    });

  const fallbackToMemory = async (): Promise<void> => {
    if (!fallbackPromise) {
      fallbackPromise = (async () => {
        limiter = createMemoryLimiter();
        usingRedis = false;
        await new Promise((resolve) => setTimeout(resolve, 100));
        fallbackPromise = null;
      })();
    }

    await fallbackPromise;
  };

  if (process.env.REDIS_URL) {
    try {
      const redis = new Redis(process.env.REDIS_URL, {
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        lazyConnect: false,
      });

      redis.on("error", (err) => {
        console.error("[RATE LIMITER] Redis error:", err.message);
        if (usingRedis) {
          console.warn("[RATE LIMITER] Falling back to in-memory");
          void fallbackToMemory();
        }
      });

      redis.on("ready", () => {
        console.log("[RATE LIMITER] Redis connected");
      });

      limiter = new RateLimiterRedis({
        storeClient: redis,
        points: maxRequests,
        duration: windowSeconds,
        blockDuration: 0,
      });

      usingRedis = true;
      console.log("[RATE LIMITER] Using Redis backend");
    } catch {
      console.warn("[RATE LIMITER] Redis init failed, using in-memory");
      fallbackToMemory();
    }
  } else {
    fallbackToMemory();
    const {
      app: { isProduction },
    } = getConfig();
    if (isProduction) {
      console.warn(
        "[RATE LIMITER] Using in-memory in production. Set REDIS_URL for distributed rate limiting."
      );
    }
  }

  const isRedisError = (error: Error) =>
    error.message.includes("Redis") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("Stream isn't writeable");

  const handleRateLimitError = (error: unknown): RateLimitResult => {
    if (error instanceof Error && "msBeforeNext" in error) {
      const rateLimitError = error as unknown as RateLimiterRes;
      return {
        isLimited: true,
        remaining: 0,
        resetAt: Date.now() + (rateLimitError.msBeforeNext || windowMs),
      };
    }
    throw error;
  };

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      try {
        const result = await limiter.consume(identifier, 1);
        return {
          isLimited: false,
          remaining: result.remainingPoints,
          resetAt: Date.now() + (result.msBeforeNext || windowMs),
        };
      } catch (error) {
        if (error instanceof Error && "msBeforeNext" in error) {
          return handleRateLimitError(error);
        }

        if (usingRedis && error instanceof Error && isRedisError(error)) {
          console.warn(
            "[RATE LIMITER] Redis connection error, falling back to in-memory",
            error.message
          );
          await fallbackToMemory();

          try {
            const result = await limiter.consume(identifier, 1);
            return {
              isLimited: false,
              remaining: result.remainingPoints,
              resetAt: Date.now() + (result.msBeforeNext || windowMs),
            };
          } catch (retryError) {
            return handleRateLimitError(retryError);
          }
        }

        console.error("[RATE LIMITER] Unexpected error:", error);
        return {
          isLimited: false,
          remaining: maxRequests,
          resetAt: Date.now() + windowMs,
        };
      }
    },

    async reset(identifier: string): Promise<void> {
      try {
        await limiter.delete(identifier);
      } catch (error) {
        console.error("[RATE LIMITER] Error resetting:", error);
      }
    },

    async getStatus(
      identifier: string
    ): Promise<{ count: number; resetAt: number } | null> {
      try {
        const result = await limiter.get(identifier);
        if (!result) return null;

        return {
          count: maxRequests - result.remainingPoints,
          resetAt: Date.now() + (result.msBeforeNext || windowMs),
        };
      } catch (error) {
        console.error("[RATE LIMITER] Error getting status:", error);
        return null;
      }
    },
  };
}

export const analyzeRateLimiter = createRateLimiter(10, 60000);
export const classifyRateLimiter = createRateLimiter(5, 60000);
export const resultsRateLimiter = createRateLimiter(60, 60000);

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const {
    app: { isProduction },
  } = getConfig();
  if (isProduction) {
    console.warn(
      "[RATE LIMITER] No IP headers found. Configure x-forwarded-for in your reverse proxy."
    );
  }

  return "unknown";
}

export function createRateLimitResponse(resetAt: number) {
  const resetDate = new Date(resetAt);
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);

  return {
    body: {
      error: "Rate limit exceeded. Please try again later.",
      resetAt: resetDate.toISOString(),
    },
    status: 429 as const,
    headers: {
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": resetDate.toISOString(),
      "Retry-After": retryAfterSeconds.toString(),
    },
  };
}
