import { Temporal } from "@js-temporal/polyfill";
import { NextRequest } from "next/server";
import { analyzeCompliance } from "@/lib/analyze";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/analyze.types";
import { db } from "@/lib/db";
import { complianceResults } from "@/lib/db/schema";
import {
  validateAction,
  validateGuideline,
  sanitizeInput,
} from "@/lib/validation";
import { apiLogger } from "@/lib/logger";
import { analyzeRateLimiter } from "@/lib/rate-limiter";
import { withRateLimit, validateEnvVars } from "@/lib/api-middleware";
import { validateFields } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  return withRateLimit(req, analyzeRateLimiter, async () => {
    validateEnvVars(["HF_API_TOKEN", "API_URL"]);

    const { action, guideline }: AnalyzeRequest = await req.json();

    validateFields([
      { value: action, validator: validateAction, name: "action" },
      { value: guideline, validator: validateGuideline, name: "guideline" },
    ]);

    const sanitizedAction = sanitizeInput(action);
    const sanitizedGuideline = sanitizeInput(guideline);

    apiLogger.info("Starting compliance analysis");
    const { result, confidence } = await analyzeCompliance(
      sanitizedAction,
      sanitizedGuideline,
      process.env.HF_API_TOKEN!,
      process.env.API_URL!
    );

    const timestamp = Temporal.Now.instant().toString({
      smallestUnit: "second",
    });

    const responseData: AnalyzeResponse = {
      action: sanitizedAction,
      guideline: sanitizedGuideline,
      result,
      confidence,
      timestamp,
    };

    apiLogger.info("Saving result to database");
    await db.insert(complianceResults).values({
      ...responseData,
      confidence: responseData.confidence.toString(),
      timestamp: new Date(responseData.timestamp),
    });
    apiLogger.info("Analysis completed successfully", { result, confidence });

    return responseData;
  });
}
