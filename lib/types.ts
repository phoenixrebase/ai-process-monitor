export type FilterOption = "all" | "COMPLIES" | "DEVIATES" | "UNCLEAR";

export type ResultsSortOption =
  | "timestamp"
  | "confidence"
  | "action"
  | "guideline";

export type ClassifySortOption = "confidence" | "alphabetical";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  [key: string]: unknown;
}

export interface RateLimitResult {
  isLimited: boolean;
  remaining: number;
  resetAt: number;
}

export interface Config {
  postgres: {
    url: string;
  };
  huggingface: {
    apiToken: string;
    apiUrl: string;
  };
  app: {
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
  };
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
