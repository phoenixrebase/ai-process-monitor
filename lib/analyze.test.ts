import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyzeCompliance } from "./analyze";
import axios from "axios";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("analyzeCompliance - Unit Tests", () => {
  const mockToken = "hf_test_token_123";
  const mockApiUrl = process.env.API_URL!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Input Validation", () => {
    it("should throw error when API token is missing", async () => {
      await expect(
        analyzeCompliance("Some action", "Some guideline", "", mockApiUrl)
      ).rejects.toThrow("API token is required");
    });

    it("should throw error when API URL is missing", async () => {
      await expect(
        analyzeCompliance("Some action", "Some guideline", mockToken, "")
      ).rejects.toThrow("API URL is required");
    });

    it("should throw error when action is empty", async () => {
      await expect(
        analyzeCompliance("", "Some guideline", mockToken, mockApiUrl)
      ).rejects.toThrow("action and guideline are required");
    });

    it("should throw error when guideline is empty", async () => {
      await expect(
        analyzeCompliance("Some action", "", mockToken, mockApiUrl)
      ).rejects.toThrow("action and guideline are required");
    });

    it("should throw error when action is whitespace only", async () => {
      await expect(
        analyzeCompliance("   ", "Some guideline", mockToken, mockApiUrl)
      ).rejects.toThrow("action and guideline are required");
    });

    it("should throw error when guideline is whitespace only", async () => {
      await expect(
        analyzeCompliance("Some action", "   \t\n  ", mockToken, mockApiUrl)
      ).rejects.toThrow("action and guideline are required");
    });

    it("should throw error when both action and guideline are empty", async () => {
      await expect(
        analyzeCompliance("", "", mockToken, mockApiUrl)
      ).rejects.toThrow("action and guideline are required");
    });
  });

  describe("Successful API Responses", () => {
    it("should classify as COMPLIES with correct response structure", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.95, 0.03, 0.02],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Closed ticket #123 with email",
        "Must send email on closure",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("COMPLIES");
      expect(result.confidence).toBe(0.95);
    });

    it("should classify as DEVIATES when scores indicate deviation", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["deviates", "complies", "unclear"],
          scores: [0.88, 0.09, 0.03],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Skipped required step",
        "Must complete all steps",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("DEVIATES");
      expect(result.confidence).toBe(0.88);
    });

    it("should classify as UNCLEAR when scores indicate uncertainty", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["unclear", "deviates", "complies"],
          scores: [0.6, 0.25, 0.15],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Performed unspecified action",
        "No guideline exists",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("UNCLEAR");
      expect(result.confidence).toBe(0.6);
    });

    it("should send correct request to HuggingFace API", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.9, 0.05, 0.05],
          sequence: "test",
        },
      });

      await analyzeCompliance(
        "Test action",
        "Test guideline",
        mockToken,
        mockApiUrl
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockApiUrl,
        {
          inputs: "Guideline: Test guideline\nAction taken: Test action",
          parameters: {
            candidate_labels: ["complies", "deviates", "unclear"],
            multi_label: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30_000,
        }
      );
    });

    it("should handle inputs with special characters", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.9, 0.05, 0.05],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Closed ticket #48219 & sent email @user",
        "All tickets must include confirmation (email)",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("COMPLIES");
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it("should handle inputs with Unicode characters", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.9, 0.05, 0.05],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Notified user via 📧 email",
        "Must notify user",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("COMPLIES");
    });
  });

  describe("API Error Handling", () => {
    it("should throw error when API returns malformed response (missing labels)", async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          scores: [0.9, 0.05, 0.05],
          sequence: "test",
        },
      });

      await expect(
        analyzeCompliance("Action", "Guideline", mockToken, mockApiUrl, 0)
      ).rejects.toThrow("Missing labels or scores in response");
    });

    it("should throw error when API returns malformed response (missing scores)", async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          sequence: "test",
        },
      });

      await expect(
        analyzeCompliance("Action", "Guideline", mockToken, mockApiUrl, 0)
      ).rejects.toThrow("Missing labels or scores in response");
    });

    it("should throw error when API returns empty arrays", async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: [],
          scores: [],
          sequence: "test",
        },
      });

      await expect(
        analyzeCompliance("Action", "Guideline", mockToken, mockApiUrl, 0)
      ).rejects.toThrow("Missing labels or scores in response");
    });

    it("should throw error when API returns null", async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        headers: { "content-type": "application/json" },
        data: null,
      });

      await expect(
        analyzeCompliance("Action", "Guideline", mockToken, mockApiUrl, 0)
      ).rejects.toThrow("Unexpected API response type");
    });

    it("should throw error when API returns non-array labels", async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: "not-an-array",
          scores: [0.9, 0.05, 0.05],
          sequence: "test",
        },
      });

      await expect(
        analyzeCompliance("Action", "Guideline", mockToken, mockApiUrl, 0)
      ).rejects.toThrow("Missing labels or scores in response");
    });

    it("should propagate network errors", async () => {
      mockedAxios.post.mockRejectedValue(new Error("Network error"));

      await expect(
        analyzeCompliance("Action", "Guideline", mockToken, mockApiUrl, 0)
      ).rejects.toThrow("Network error");
    });

    it("should propagate timeout errors", async () => {
      const error = new Error("timeout of 30000ms exceeded") as Error & {
        code: string;
        isAxiosError: boolean;
      };
      error.code = "ECONNABORTED";
      error.isAxiosError = true;
      mockedAxios.post.mockRejectedValue(error);
      (mockedAxios.isAxiosError as unknown as ReturnType<typeof vi.fn>) = vi
        .fn()
        .mockReturnValue(true);

      await expect(
        analyzeCompliance("Action", "Guideline", mockToken, mockApiUrl, 0)
      ).rejects.toThrow(
        "HuggingFace API timeout after 1 attempts - model failed to load"
      );
    });

    it("should propagate 401 authentication errors", async () => {
      const error = new Error(
        "Request failed with status code 401"
      ) as Error & { response: { status: number; data: { error: string } } };
      error.response = {
        status: 401,
        data: { error: "Invalid authentication" },
      };
      mockedAxios.post.mockRejectedValue(error);

      await expect(
        analyzeCompliance("Action", "Guideline", "invalid-token", mockApiUrl, 0)
      ).rejects.toThrow("Request failed with status code 401");
    });

    it("should propagate 500 server errors", async () => {
      const error = new Error(
        "Request failed with status code 500"
      ) as Error & { response: { status: number; data: { error: string } } };
      error.response = {
        status: 500,
        data: { error: "Internal server error" },
      };
      mockedAxios.post.mockRejectedValue(error);

      await expect(
        analyzeCompliance("Action", "Guideline", mockToken, mockApiUrl, 0)
      ).rejects.toThrow("Request failed with status code 500");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long action text", async () => {
      const longAction = "A".repeat(5000);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.8, 0.15, 0.05],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        longAction,
        "Guideline",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("COMPLIES");
    });

    it("should handle very long guideline text", async () => {
      const longGuideline = "B".repeat(5000);
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.8, 0.15, 0.05],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Action",
        longGuideline,
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("COMPLIES");
    });

    it("should handle action with leading/trailing whitespace", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.9, 0.05, 0.05],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "  Action with spaces  ",
        "Guideline",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("COMPLIES");
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it("should handle multiline action text", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.9, 0.05, 0.05],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Step 1: Did something\nStep 2: Did another thing",
        "Must complete steps",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("COMPLIES");
    });

    it("should correctly identify highest score when scores are close", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["unclear", "deviates", "complies"],
          scores: [0.34, 0.33, 0.33],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Ambiguous action",
        "Ambiguous guideline",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("UNCLEAR");
      expect(result.confidence).toBe(0.34);
    });

    it("should handle case when all scores are equal", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          labels: ["complies", "deviates", "unclear"],
          scores: [0.33, 0.33, 0.33],
          sequence: "test",
        },
      });

      const result = await analyzeCompliance(
        "Action",
        "Guideline",
        mockToken,
        mockApiUrl
      );

      expect(result.result).toBe("COMPLIES");
      expect(result.confidence).toBe(0.33);
    });
  });
});
