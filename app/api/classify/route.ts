import { Temporal } from "@js-temporal/polyfill";
import { NextRequest } from "next/server";
import { analyzeCompliance } from "@/lib/analyze";
import type { ClassifyRequest, ClassifyResult } from "@/lib/analyze.types";
import { db } from "@/lib/db";
import { complianceResults } from "@/lib/db/schema";
import { validateAction, sanitizeInput } from "@/lib/validation";
import { apiLogger } from "@/lib/logger";
import { NO_RETRIES } from "@/lib/constants";
import { classifyRateLimiter } from "@/lib/rate-limiter";
import { withRateLimit, validateEnvVars } from "@/lib/api-middleware";
import { validateFields } from "@/lib/api-validation";

const MAX_CONCURRENT_REQUESTS = 5;

/**
 * Run promises with a concurrency limit to prevent overwhelming the API
 */
async function promiseAllSettledWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: Promise<PromiseSettledResult<R>>[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason })
    );

    results.push(promise);

    const executing_promise = promise.then(() => {
      executing.splice(executing.indexOf(executing_promise), 1);
    });

    executing.push(executing_promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return Promise.all(results);
}

export async function POST(req: NextRequest) {
  return withRateLimit(req, classifyRateLimiter, async () => {
    validateEnvVars(["HF_API_TOKEN", "API_URL"]);

    const { action }: ClassifyRequest = await req.json();

    validateFields([
      { value: action, validator: validateAction, name: "action" },
    ]);

    const sanitizedAction = sanitizeInput(action);

    const uniqueGuidelines = await db
      .selectDistinct({ guideline: complianceResults.guideline })
      .from(complianceResults);

    apiLogger.info(
      uniqueGuidelines.length === 0
        ? "No guidelines found in database"
        : "Starting classification",
      { guidelineCount: uniqueGuidelines.length }
    );

    const analysisResults = await promiseAllSettledWithLimit(
      uniqueGuidelines,
      MAX_CONCURRENT_REQUESTS,
      ({ guideline }) =>
        analyzeCompliance(
          sanitizedAction,
          guideline,
          process.env.HF_API_TOKEN!,
          process.env.API_URL!,
          NO_RETRIES
        ).then(({ result, confidence }) => ({ guideline, result, confidence }))
    );

    const results = analysisResults
      .filter(
        (result): result is PromiseFulfilledResult<ClassifyResult> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value);

    apiLogger.info("Classification completed successfully", {
      successCount: results.length,
      totalGuidelines: uniqueGuidelines.length,
    });

    return {
      action: sanitizedAction,
      results,
      timestamp: Temporal.Now.instant().toString({ smallestUnit: "second" }),
      totalGuidelines: uniqueGuidelines.length,
    };
  });
}
