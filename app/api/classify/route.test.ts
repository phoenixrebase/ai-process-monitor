import { describe, it, expect, beforeEach, vi } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { classifyRateLimiter } from "@/lib/rate-limiter";
import type { ClassifyResponse } from "@/lib/analyze.types";

const { mockFrom, mockSelectDistinct } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSelectDistinct = vi.fn(() => ({
    from: mockFrom,
  }));
  return { mockFrom, mockSelectDistinct };
});

vi.mock("@/lib/db", () => ({
  db: {
    selectDistinct: mockSelectDistinct,
  },
  complianceResults: {},
}));

describe("POST /api/classify", () => {
  beforeEach(async () => {
    await classifyRateLimiter.reset("unknown");
    vi.clearAllMocks();
    mockFrom.mockResolvedValue([]);
  });

  const createRequest = (body: { action: string }) => {
    return new NextRequest("http://localhost:3000/api/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  };

  describe("Success scenarios", () => {
    it("should classify action against multiple guidelines successfully", async () => {
      mockFrom.mockResolvedValue([
        { guideline: "All closed tickets must include a confirmation email" },
        { guideline: "Servers must be rebooted weekly" },
        { guideline: "Database backups must be verified after completion" },
      ]);

      server.use(
        http.post(process.env.API_URL!, async ({ request }) => {
          const body = await request.text();

          if (body.includes("confirmation email")) {
            return HttpResponse.json({
              labels: ["complies", "deviates", "unclear"],
              scores: [0.95, 0.03, 0.02],
              sequence: "test",
            });
          } else if (body.includes("rebooted weekly")) {
            return HttpResponse.json({
              labels: ["deviates", "complies", "unclear"],
              scores: [0.88, 0.08, 0.04],
              sequence: "test",
            });
          } else {
            return HttpResponse.json({
              labels: ["unclear", "complies", "deviates"],
              scores: [0.7, 0.2, 0.1],
              sequence: "test",
            });
          }
        })
      );

      const request = createRequest({
        action: "Closed ticket #123 and sent email",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe("Closed ticket #123 and sent email");
      expect(data.results).toHaveLength(3);
      expect(data.totalGuidelines).toBe(3);
      expect(data.timestamp).toBeDefined();

      const results = data.results;
      expect(results[0].guideline).toBe(
        "All closed tickets must include a confirmation email"
      );
      expect(results[0].result).toBe("COMPLIES");
      expect(results[0].confidence).toBeGreaterThan(0.9);

      expect(results[1].guideline).toBe("Servers must be rebooted weekly");
      expect(results[1].result).toBe("DEVIATES");

      expect(results[2].guideline).toBe(
        "Database backups must be verified after completion"
      );
      expect(results[2].result).toBe("UNCLEAR");
    });

    it("should return empty results when no guidelines exist", async () => {
      mockFrom.mockResolvedValue([]);

      const request = createRequest({
        action: "Some action",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe("Some action");
      expect(data.results).toHaveLength(0);
      expect(data.totalGuidelines).toBe(0);
      expect(data.timestamp).toBeDefined();
    });

    it("should include rate limit headers in response", async () => {
      mockFrom.mockResolvedValue([{ guideline: "Test guideline" }]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.9, 0.05, 0.05],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);

      expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    it("should sanitize input before analysis", async () => {
      mockFrom.mockResolvedValue([{ guideline: "Test guideline" }]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.9, 0.05, 0.05],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "  Test    action   with   extra    spaces  ",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe("Test action with extra spaces");
    });

    it("should handle single guideline", async () => {
      mockFrom.mockResolvedValue([{ guideline: "Single guideline" }]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.92, 0.05, 0.03],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.totalGuidelines).toBe(1);
      expect(data.results[0].guideline).toBe("Single guideline");
      expect(data.results[0].result).toBe("COMPLIES");
    });
  });

  describe("Promise.allSettled - Partial failures", () => {
    it("should return only successful results when some analyses fail", async () => {
      mockFrom.mockResolvedValue([
        { guideline: "Guideline 1" },
        { guideline: "Guideline 2" },
        { guideline: "Guideline 3" },
      ]);

      let callCount = 0;
      server.use(
        http.post(process.env.API_URL!, () => {
          callCount++;

          if (callCount === 1) {
            return HttpResponse.json({
              labels: ["complies", "deviates", "unclear"],
              scores: [0.9, 0.05, 0.05],
              sequence: "test",
            });
          } else if (callCount === 2) {
            return HttpResponse.json({ error: "API Error" }, { status: 500 });
          } else {
            return HttpResponse.json({
              labels: ["deviates", "complies", "unclear"],
              scores: [0.85, 0.1, 0.05],
              sequence: "test",
            });
          }
        })
      );

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(2);
      expect(data.totalGuidelines).toBe(3);

      expect(data.results[0].guideline).toBe("Guideline 1");
      expect(data.results[0].result).toBe("COMPLIES");

      expect(data.results[1].guideline).toBe("Guideline 3");
      expect(data.results[1].result).toBe("DEVIATES");
    }, 15000);

    it("should return empty results when all analyses fail", async () => {
      mockFrom.mockResolvedValue([
        { guideline: "Guideline 1" },
        { guideline: "Guideline 2" },
      ]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({ error: "API Error" }, { status: 500 });
        })
      );

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(0);
      expect(data.totalGuidelines).toBe(2);
    }, 15000);
  });

  describe("Environment variable validation", () => {
    it("should return 500 when HF_API_TOKEN is missing", async () => {
      const originalToken = process.env.HF_API_TOKEN;
      delete process.env.HF_API_TOKEN;

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server configuration error");

      process.env.HF_API_TOKEN = originalToken;
    });

    it("should return 500 when API_URL is missing", async () => {
      const originalUrl = process.env.API_URL;
      delete process.env.API_URL;

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server configuration error");

      process.env.API_URL = originalUrl;
    });
  });

  describe("Input validation", () => {
    it("should return 400 when action is empty", async () => {
      const request = createRequest({
        action: "",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be empty");
    });

    it("should return 400 when action is whitespace only", async () => {
      const request = createRequest({
        action: "   \t\n   ",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be empty");
    });

    it("should return 400 when action exceeds maximum length", async () => {
      const request = createRequest({
        action: "a".repeat(5001),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("cannot exceed 5000 characters");
    });

    it("should return 400 when action contains null byte", async () => {
      const request = createRequest({
        action: "Test\0action",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Action contains invalid characters");
    });
  });

  describe("Database errors", () => {
    it("should return 500 when database query fails", async () => {
      mockFrom.mockRejectedValue(new Error("Database connection failed"));

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe("Database unavailable - please try again later");
    });
  });

  describe("Edge cases", () => {
    it("should handle action at maximum length", async () => {
      mockFrom.mockResolvedValue([{ guideline: "Test guideline" }]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.8, 0.15, 0.05],
            sequence: "test",
          });
        })
      );

      const longAction = "A".repeat(5000);
      const request = createRequest({
        action: longAction,
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
    });

    it("should handle special characters in action", async () => {
      mockFrom.mockResolvedValue([{ guideline: "Test guideline" }]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.9, 0.05, 0.05],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Ticket #123 & email @user (test) <tag>",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
    });

    it("should handle multiline action", async () => {
      mockFrom.mockResolvedValue([{ guideline: "Test guideline" }]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.9, 0.05, 0.05],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Step 1: Did this\nStep 2: Did that\nStep 3: Completed",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe(
        "Step 1: Did this Step 2: Did that Step 3: Completed"
      );
    });

    it("should handle many guidelines efficiently", async () => {
      const manyGuidelines = Array.from({ length: 20 }, (_, i) => ({
        guideline: `Guideline ${i + 1}`,
      }));

      mockFrom.mockResolvedValue(manyGuidelines);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.8, 0.15, 0.05],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(20);
      expect(data.totalGuidelines).toBe(20);
    });

    it("should handle Unicode characters in action", async () => {
      mockFrom.mockResolvedValue([{ guideline: "Test guideline" }]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.9, 0.05, 0.05],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Café naïve résumé 日本語 🚀",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe("Café naïve résumé 日本語 🚀");
    });
  });

  describe("Response structure", () => {
    it("should return valid ClassifyResponse structure", async () => {
      mockFrom.mockResolvedValue([{ guideline: "Test guideline" }]);

      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.9, 0.05, 0.05],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Test action",
      });

      const response = await POST(request);
      const data: ClassifyResponse = await response.json();

      expect(data).toHaveProperty("action");
      expect(data).toHaveProperty("results");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("totalGuidelines");

      expect(Array.isArray(data.results)).toBe(true);
      expect(typeof data.action).toBe("string");
      expect(typeof data.timestamp).toBe("string");
      expect(typeof data.totalGuidelines).toBe("number");

      if (data.results.length > 0) {
        const result = data.results[0];
        expect(result).toHaveProperty("guideline");
        expect(result).toHaveProperty("result");
        expect(result).toHaveProperty("confidence");
        expect(typeof result.guideline).toBe("string");
        expect(["COMPLIES", "DEVIATES", "UNCLEAR"]).toContain(result.result);
        expect(typeof result.confidence).toBe("number");
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
