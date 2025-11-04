import axios from "axios";
import { getConfig } from "./config";
import { ApiErrorResponse } from "./types";
import { ValidationError } from "./api-validation";

export function sanitizeErrorMessage(err: unknown): string {
  if (err instanceof ValidationError) {
    return err.message;
  }

  if (axios.isAxiosError(err)) {
    if (err.response?.status) {
      const status = err.response.status;

      if (status >= 500) {
        return "External service error - please try again later";
      } else if (status === 429) {
        return "Rate limit exceeded - please try again later";
      } else if (status >= 400 && status < 500) {
        return "Invalid request - please check your input";
      }
    }

    if (err.code === "ECONNABORTED") {
      return "Request timeout - please try again";
    }

    return "External API error - please try again later";
  }

  if (err instanceof Error) {
    const lowerMessage = err.message.toLowerCase();

    if (
      lowerMessage.includes("failed query") ||
      lowerMessage.includes("connection") ||
      lowerMessage.includes("database")
    ) {
      return "Database unavailable - please try again later";
    }

    if (lowerMessage.includes("timeout")) {
      return "Operation timed out - please try again later";
    }

    if (
      lowerMessage.includes("required") ||
      lowerMessage.includes("invalid") ||
      lowerMessage.includes("expected") ||
      lowerMessage.includes("server configuration")
    ) {
      return err.message;
    }

    return "An error occurred - please try again later";
  }

  return "Unknown error occurred";
}

export function createErrorResponse(
  err: unknown,
  defaultStatusCode: number = 500
): { response: ApiErrorResponse; status: number } {
  const message = sanitizeErrorMessage(err);
  let statusCode = defaultStatusCode;

  if (err instanceof ValidationError) {
    statusCode = 400;
  } else if (axios.isAxiosError(err)) {
    statusCode = err.response?.status ?? 500;
  } else if (err instanceof Error) {
    const lowerMessage = err.message.toLowerCase();

    if (
      lowerMessage.includes("failed query") ||
      lowerMessage.includes("database")
    ) {
      statusCode = 503;
    } else if (lowerMessage.includes("timeout")) {
      statusCode = 504;
    } else if (
      lowerMessage.includes("required") ||
      lowerMessage.includes("invalid")
    ) {
      statusCode = 400;
    }
  }

  const {
    app: { isDevelopment },
  } = getConfig();

  const response: ApiErrorResponse = { error: message };

  if (!isDevelopment && err instanceof Error) {
    console.error(`[PRODUCTION ERROR] ${err.message}`, {
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }

  return { response, status: statusCode };
}
