import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { complianceResults } from "@/lib/db/schema";
import { desc, like, or, eq, count } from "drizzle-orm";
import { DEFAULT_RESULTS_LIMIT } from "@/lib/constants";
import { resultsRateLimiter } from "@/lib/rate-limiter";
import { withRateLimit } from "@/lib/api-middleware";

export async function GET(req: NextRequest) {
  return withRateLimit(req, resultsRateLimiter, async () => {
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || String(DEFAULT_RESULTS_LIMIT), 10)
      )
    );
    const filter = searchParams.get("filter") || "all";
    const sortBy = searchParams.get("sortBy") || "timestamp";
    const search = searchParams.get("search") || "";

    const whereConditions = [];
    if (filter !== "all") {
      whereConditions.push(eq(complianceResults.result, filter));
    }
    if (search.trim()) {
      whereConditions.push(
        or(
          like(complianceResults.action, `%${search}%`),
          like(complianceResults.guideline, `%${search}%`)
        )
      );
    }

    const orderByColumn =
      sortBy === "confidence"
        ? complianceResults.confidence
        : complianceResults.timestamp;
    const orderByDirection = desc(orderByColumn);

    const [{ total }] = await db
      .select({ total: count() })
      .from(complianceResults)
      .where(whereConditions.length > 0 ? whereConditions[0] : undefined);

    const offset = (page - 1) * limit;
    const results = await db
      .select()
      .from(complianceResults)
      .where(whereConditions.length > 0 ? whereConditions[0] : undefined)
      .orderBy(orderByDirection)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return {
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  });
}
