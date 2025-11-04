import { NextRequest, NextResponse } from "next/server";
import { analyzeRateLimiter, getClientIdentifier, createRateLimitResponse } from "@/lib/rate-limiter";
import { createErrorResponse } from "@/lib/api-error-handler";
import { apiLogger } from "@/lib/logger";

type RateLimiter = typeof analyzeRateLimiter;

export async function withRateLimit<T>(
  req: NextRequest,
  rateLimiter: RateLimiter,
  handler: (clientId: string) => Promise<T>
): Promise<NextResponse> {
  const clientId = getClientIdentifier(req);

  try {
    const { isLimited, remaining, resetAt } = await rateLimiter.check(clientId);

    if (isLimited) {
      apiLogger.warn("Rate limit exceeded", {
        clientId,
        resetAt: new Date(resetAt).toISOString(),
      });
      const rateLimitResponse = createRateLimitResponse(resetAt);
      return NextResponse.json(rateLimitResponse.body, {
        status: rateLimitResponse.status,
        headers: rateLimitResponse.headers,
      });
    }

    const result = await handler(clientId);

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
      },
    });
  } catch (err) {
    apiLogger.error("Error occurred", err);
    const { response, status } = createErrorResponse(err);
    return NextResponse.json(response, { status });
  }
}

export function validateEnvVars(vars: string[]): void {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    apiLogger.error("Missing required environment variables", { missing });
    throw new Error("Server configuration error");
  }
}
