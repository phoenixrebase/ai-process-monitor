import { describe, it, expect, beforeEach, vi } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { analyzeRateLimiter } from "@/lib/rate-limiter";

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

describe("POST /api/analyze - Compliance Test Cases", () => {
  beforeEach(async () => {
    await analyzeRateLimiter.reset("unknown");
  });

  const createRequest = (body: { action: string; guideline: string }) => {
    return new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  };

  describe("Case 1: COMPLIES - Closed ticket with confirmation email", () => {
    it("should return COMPLIES when action follows guideline", async () => {
      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["complies", "deviates", "unclear"],
            scores: [0.95, 0.03, 0.02],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Closed ticket #48219 and sent confirmation email",
        guideline: "All closed tickets must include a confirmation email",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBe("COMPLIES");
      expect(data.action).toBe(
        "Closed ticket #48219 and sent confirmation email"
      );
      expect(data.guideline).toBe(
        "All closed tickets must include a confirmation email"
      );
      expect(data.confidence).toBeGreaterThan(0.9);
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("Case 2: DEVIATES - Closed ticket without confirmation email", () => {
    it("should return DEVIATES when action violates guideline", async () => {
      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["deviates", "complies", "unclear"],
            scores: [0.92, 0.05, 0.03],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Closed ticket #48219 without sending confirmation email",
        guideline: "All closed tickets must include a confirmation email",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBe("DEVIATES");
      expect(data.action).toBe(
        "Closed ticket #48219 without sending confirmation email"
      );
      expect(data.guideline).toBe(
        "All closed tickets must include a confirmation email"
      );
      expect(data.confidence).toBeGreaterThan(0.9);
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("Case 3: DEVIATES - Incomplete server maintenance", () => {
    it("should return DEVIATES when action partially follows guideline", async () => {
      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["deviates", "unclear", "complies"],
            scores: [0.88, 0.08, 0.04],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Rebooted the server and checked logs",
        guideline:
          "Servers must be rebooted weekly and logs reviewed after restart",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBe("DEVIATES");
      expect(data.action).toBe("Rebooted the server and checked logs");
      expect(data.guideline).toBe(
        "Servers must be rebooted weekly and logs reviewed after restart"
      );
      expect(data.confidence).toBeGreaterThan(0.8);
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("Case 4: UNCLEAR - No guideline exists", () => {
    it("should return UNCLEAR when no guideline exists for the action", async () => {
      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            labels: ["unclear", "deviates", "complies"],
            scores: [0.85, 0.09, 0.06],
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Skipped torque confirmation at Station 3",
        guideline: "No guidelines exist for this case.",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBe("UNCLEAR");
      expect(data.action).toBe("Skipped torque confirmation at Station 3");
      expect(data.guideline).toBe("No guidelines exist for this case.");
      expect(data.confidence).toBeGreaterThan(0.8);
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should return 400 when action is missing", async () => {
      const request = createRequest({
        action: "",
        guideline: "Some guideline",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be empty");
    });

    it("should return 400 when guideline is missing", async () => {
      const request = createRequest({
        action: "Some action",
        guideline: "",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Guideline cannot be empty");
    });

    it("should return 400 when action is whitespace only", async () => {
      const request = createRequest({
        action: "   \t\n   ",
        guideline: "Some guideline",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Action cannot be empty");
    });

    it("should return 400 when guideline is whitespace only", async () => {
      const request = createRequest({
        action: "Some action",
        guideline: "   \t\n   ",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Guideline cannot be empty");
    });

    it("should return 500 when HuggingFace API fails", async () => {
      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({ error: "API Error" }, { status: 500 });
        })
      );

      const request = createRequest({
        action: "Some action",
        guideline: "Some guideline",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    }, 15000);

    it("should return 500 when HuggingFace API returns malformed data", async () => {
      server.use(
        http.post(process.env.API_URL!, () => {
          return HttpResponse.json({
            sequence: "test",
          });
        })
      );

      const request = createRequest({
        action: "Some action",
        guideline: "Some guideline",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    }, 15000);
  });

  describe("Edge cases", () => {
    it("should handle very long action text", async () => {
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
        guideline: "Some guideline",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBe("COMPLIES");
    });

    it("should handle special characters in input", async () => {
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
        action: "Ticket #123 & email @user (test)",
        guideline: "Must notify <user> via email",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBe("COMPLIES");
    });

    it("should handle multiline input", async () => {
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
        action: "Step 1: Did this\nStep 2: Did that",
        guideline: "Must complete:\n1. First step\n2. Second step",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result).toBe("COMPLIES");
    });
  });
});
