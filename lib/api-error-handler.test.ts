import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { sanitizeErrorMessage, createErrorResponse } from "./api-error-handler";
import * as config from "./config";

describe("api-error-handler - sanitizeErrorMessage", () => {
  describe("Axios errors", () => {
    it("should return external service error for 500+ status", () => {
      const error = {
        isAxiosError: true,
        response: { status: 500 },
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("External service error - please try again later");
    });

    it("should return external service error for 503 status", () => {
      const error = {
        isAxiosError: true,
        response: { status: 503 },
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("External service error - please try again later");
    });

    it("should return rate limit error for 429 status", () => {
      const error = {
        isAxiosError: true,
        response: { status: 429 },
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Rate limit exceeded - please try again later");
    });

    it("should return invalid request error for 400 status", () => {
      const error = {
        isAxiosError: true,
        response: { status: 400 },
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Invalid request - please check your input");
    });

    it("should return invalid request error for 404 status", () => {
      const error = {
        isAxiosError: true,
        response: { status: 404 },
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Invalid request - please check your input");
    });

    it("should return invalid request error for 499 status", () => {
      const error = {
        isAxiosError: true,
        response: { status: 499 },
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Invalid request - please check your input");
    });

    it("should return request timeout for ECONNABORTED code", () => {
      const error = {
        isAxiosError: true,
        code: "ECONNABORTED",
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Request timeout - please try again");
    });

    it("should return generic external API error when no status or code", () => {
      const error = {
        isAxiosError: true,
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("External API error - please try again later");
    });
  });

  describe("Regular Error instances", () => {
    it("should detect failed query database error", () => {
      const error = new Error("Failed query execution");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Database unavailable - please try again later");
    });

    it("should detect connection database error", () => {
      const error = new Error("Connection to database lost");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Database unavailable - please try again later");
    });

    it("should detect database keyword in error", () => {
      const error = new Error("Database is not responding");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Database unavailable - please try again later");
    });

    it("should detect timeout in error message", () => {
      const error = new Error("Request timeout after 30 seconds");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Operation timed out - please try again later");
    });

    it("should return original message for 'required' validation error", () => {
      const error = new Error("Email is required");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Email is required");
    });

    it("should return original message for 'invalid' validation error", () => {
      const error = new Error("Invalid email format");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Invalid email format");
    });

    it("should return original message for 'expected' validation error", () => {
      const error = new Error("Expected string, got number");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Expected string, got number");
    });

    it("should return generic error for unrecognized Error", () => {
      const error = new Error("Something went wrong");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("An error occurred - please try again later");
    });
  });

  describe("Unknown error types", () => {
    it("should handle string error", () => {
      const error = "Some string error";

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Unknown error occurred");
    });

    it("should handle number error", () => {
      const error = 500;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Unknown error occurred");
    });

    it("should handle null error", () => {
      const error = null;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Unknown error occurred");
    });

    it("should handle undefined error", () => {
      const error = undefined;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

      const result = sanitizeErrorMessage(error);
      expect(result).toBe("Unknown error occurred");
    });
  });
});

describe("api-error-handler - createErrorResponse", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Status code mapping", () => {
    it("should use Axios response status", () => {
      const error = {
        isAxiosError: true,
        response: { status: 429 },
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error);
      expect(result.status).toBe(429);
    });

    it("should default to 500 for Axios error without status", () => {
      const error = {
        isAxiosError: true,
      } as unknown as Error;

      vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error);
      expect(result.status).toBe(500);
    });

    it("should map database error to 503", () => {
      const error = new Error("Failed query execution");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error);
      expect(result.status).toBe(503);
    });

    it("should map timeout error to 504", () => {
      const error = new Error("Request timeout");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error);
      expect(result.status).toBe(504);
    });

    it("should map validation error with 'required' to 400", () => {
      const error = new Error("Email is required");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error);
      expect(result.status).toBe(400);
    });

    it("should map validation error with 'invalid' to 400", () => {
      const error = new Error("Invalid email format");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error);
      expect(result.status).toBe(400);
    });

    it("should use default status code for unknown error", () => {
      const error = new Error("Something went wrong");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error, 500);
      expect(result.status).toBe(500);
    });

    it("should use custom default status code", () => {
      const error = new Error("Something went wrong");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error, 418);
      expect(result.status).toBe(418);
    });
  });

  describe("Development mode behavior", () => {
    it("should not log to console in development", () => {
      const error = new Error("Test error");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: true, isProduction: false },
      } as ReturnType<typeof config.getConfig>);

      createErrorResponse(error);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("Production mode behavior", () => {
    it("should log Error to console in production", () => {
      const error = new Error("Test error in production");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      createErrorResponse(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[PRODUCTION ERROR] Test error in production",
        expect.objectContaining({
          stack: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it("should not log non-Error objects to console in production", () => {
      const error = "String error";

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      createErrorResponse(error);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should include timestamp in production logs", () => {
      const error = new Error("Test error");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const beforeTime = new Date().toISOString();
      createErrorResponse(error);
      const afterTime = new Date().toISOString();

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedTimestamp = consoleErrorSpy.mock.calls[0][1].timestamp;
      expect(loggedTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(loggedTimestamp >= beforeTime).toBe(true);
      expect(loggedTimestamp <= afterTime).toBe(true);
    });
  });

  describe("Response structure", () => {
    it("should return correct response structure", () => {
      const error = new Error("Test error");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error);
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("status");
      expect(result.response).toHaveProperty("error");
      expect(typeof result.response.error).toBe("string");
      expect(typeof result.status).toBe("number");
    });

    it("should sanitize error message in response", () => {
      const error = new Error("Failed query execution");

      vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
      vi.spyOn(config, "getConfig").mockReturnValue({
        app: { isDevelopment: false, isProduction: true },
      } as ReturnType<typeof config.getConfig>);

      const result = createErrorResponse(error);
      expect(result.response.error).toBe(
        "Database unavailable - please try again later"
      );
    });
  });
});
