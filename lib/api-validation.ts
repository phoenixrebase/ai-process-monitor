import { apiLogger } from "@/lib/logger";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface FieldToValidate {
  value: unknown;
  validator: (value: unknown) => ValidationResult;
  name: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateFields(fields: FieldToValidate[]): void {
  for (const { value, validator, name } of fields) {
    const validation = validator(value);
    if (!validation.valid) {
      apiLogger.warn(`Invalid ${name}`, { error: validation.error });
      throw new ValidationError(validation.error || `Invalid ${name}`);
    }
  }
}
