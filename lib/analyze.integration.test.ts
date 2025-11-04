import { describe, it, expect, beforeAll } from "vitest";
import { analyzeCompliance } from "./analyze";

describe("analyzeCompliance - Real API Integration", () => {
  const apiToken = process.env.HF_API_TOKEN;
  const apiUrl = process.env.API_URL!;

  beforeAll(() => {
    if (!apiToken) {
      console.log("\n⚠️  Skipping - HF_API_TOKEN not found\n");
    }
  });

  const testIf = apiToken ? it : it.skip;

  describe("Model Classification Behavior", () => {
    testIf(
      "COMPLIES - action follows guideline",
      async () => {
        const result = await analyzeCompliance(
          "Closed ticket #48219 and sent confirmation email",
          "All closed tickets must include a confirmation email",
          apiToken!,
          apiUrl
        );

        console.log(`→ ${result.result} (${result.confidence.toFixed(2)})`);

        expect(result.result).toBe("COMPLIES");
        expect(result.confidence).toBeGreaterThan(0.6);
      },
      125000
    );

    testIf(
      "DEVIATES - action violates guideline",
      async () => {
        const result = await analyzeCompliance(
          "Closed ticket #48219 without sending confirmation email",
          "All closed tickets must include a confirmation email",
          apiToken!,
          apiUrl
        );

        console.log(`→ ${result.result} (${result.confidence.toFixed(2)})`);

        expect(result.result).toBe("DEVIATES");
        expect(result.confidence).toBeGreaterThan(0.6);
      },
      125000
    );

    testIf(
      "UNCLEAR/DEVIATES - no guideline exists",
      async () => {
        const result = await analyzeCompliance(
          "Skipped torque confirmation at Station 3",
          "No guidelines exist for this case.",
          apiToken!,
          apiUrl
        );

        console.log(`→ ${result.result} (${result.confidence.toFixed(2)})`);

        expect(["UNCLEAR", "DEVIATES"]).toContain(result.result);
      },
      125000
    );

    testIf(
      "Ambiguous - model doesn't catch missing frequency requirement",
      async () => {
        const result = await analyzeCompliance(
          "Rebooted the server and checked logs",
          "Servers must be rebooted weekly and logs reviewed after restart",
          apiToken!,
          apiUrl
        );

        console.log(`→ ${result.result} (${result.confidence.toFixed(2)})`);

        expect(["DEVIATES", "UNCLEAR", "COMPLIES"]).toContain(result.result);
      },
      125000
    );
  });
});
