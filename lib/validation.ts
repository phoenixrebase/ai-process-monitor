import { ValidationResult } from "./types";

export const VALIDATION_LIMITS = {
  ACTION_MAX_LENGTH: 5000,
  GUIDELINE_MAX_LENGTH: 5000,
  ACTION_MIN_LENGTH: 1,
  GUIDELINE_MIN_LENGTH: 1,
} as const;

export function validateString(
  value: unknown,
  fieldName: string,
  minLength: number,
  maxLength: number
): ValidationResult {
  if (typeof value !== "string") {
    return {
      valid: false,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: `${fieldName} cannot be empty`,
    };
  }

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} character${
        minLength === 1 ? "" : "s"
      }`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters (got ${trimmed.length})`,
    };
  }

  if (trimmed.includes("\0")) {
    return {
      valid: false,
      error: `${fieldName} contains invalid characters`,
    };
  }

  return { valid: true };
}

export function validateAction(action: unknown): ValidationResult {
  return validateString(
    action,
    "Action",
    VALIDATION_LIMITS.ACTION_MIN_LENGTH,
    VALIDATION_LIMITS.ACTION_MAX_LENGTH
  );
}

export function validateGuideline(guideline: unknown): ValidationResult {
  return validateString(
    guideline,
    "Guideline",
    VALIDATION_LIMITS.GUIDELINE_MIN_LENGTH,
    VALIDATION_LIMITS.GUIDELINE_MAX_LENGTH
  );
}

export function sanitizeInput(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
