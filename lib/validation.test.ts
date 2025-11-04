import { describe, it, expect } from "vitest";
import {
  validateString,
  validateAction,
  validateGuideline,
  sanitizeInput,
  VALIDATION_LIMITS,
} from "./validation";

describe("validation - validateString", () => {
  describe("Type validation", () => {
    it("should reject non-string values (number)", () => {
      const result = validateString(123, "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField must be a string");
    });

    it("should reject non-string values (object)", () => {
      const result = validateString({}, "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField must be a string");
    });

    it("should reject non-string values (array)", () => {
      const result = validateString([], "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField must be a string");
    });

    it("should reject non-string values (null)", () => {
      const result = validateString(null, "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField must be a string");
    });

    it("should reject non-string values (undefined)", () => {
      const result = validateString(undefined, "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField must be a string");
    });

    it("should reject non-string values (boolean)", () => {
      const result = validateString(true, "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField must be a string");
    });
  });

  describe("Empty string validation", () => {
    it("should reject empty string", () => {
      const result = validateString("", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField cannot be empty");
    });

    it("should reject whitespace-only string (spaces)", () => {
      const result = validateString("   ", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField cannot be empty");
    });

    it("should reject whitespace-only string (tabs)", () => {
      const result = validateString("\t\t\t", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField cannot be empty");
    });

    it("should reject whitespace-only string (newlines)", () => {
      const result = validateString("\n\n\n", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField cannot be empty");
    });

    it("should reject whitespace-only string (mixed)", () => {
      const result = validateString(" \t\n ", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField cannot be empty");
    });
  });

  describe("Length validation", () => {
    it("should reject string shorter than minLength", () => {
      const result = validateString("ab", "TestField", 3, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField must be at least 3 characters");
    });

    it("should reject string shorter than minLength (singular)", () => {
      const result = validateString("", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField cannot be empty");
    });

    it("should accept string exactly at minLength", () => {
      const result = validateString("abc", "TestField", 3, 100);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept string exactly at maxLength", () => {
      const result = validateString("a".repeat(100), "TestField", 1, 100);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject string longer than maxLength", () => {
      const longString = "a".repeat(101);
      const result = validateString(longString, "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "TestField cannot exceed 100 characters (got 101)"
      );
    });

    it("should reject string much longer than maxLength", () => {
      const longString = "a".repeat(10000);
      const result = validateString(longString, "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "TestField cannot exceed 100 characters (got 10000)"
      );
    });

    it("should trim before checking length", () => {
      const result = validateString("  abc  ", "TestField", 3, 100);
      expect(result.valid).toBe(true);
    });

    it("should trim and reject if too short after trim", () => {
      const result = validateString("  ab  ", "TestField", 3, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField must be at least 3 characters");
    });
  });

  describe("Null byte validation", () => {
    it("should reject string with null byte at start", () => {
      const result = validateString("\0test", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField contains invalid characters");
    });

    it("should reject string with null byte in middle", () => {
      const result = validateString("test\0string", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField contains invalid characters");
    });

    it("should reject string with null byte at end", () => {
      const result = validateString("test\0", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField contains invalid characters");
    });

    it("should reject string with multiple null bytes", () => {
      const result = validateString("\0test\0string\0", "TestField", 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("TestField contains invalid characters");
    });
  });

  describe("Valid strings", () => {
    it("should accept valid simple string", () => {
      const result = validateString("valid string", "TestField", 1, 100);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept string with special characters", () => {
      const result = validateString(
        "test!@#$%^&*()_+-=[]{}|;:',.<>?/",
        "TestField",
        1,
        100
      );
      expect(result.valid).toBe(true);
    });

    it("should accept string with Unicode characters", () => {
      const result = validateString("café naïve 日本語", "TestField", 1, 100);
      expect(result.valid).toBe(true);
    });

    it("should accept string with emojis", () => {
      const result = validateString("test 🚀 emoji 😊", "TestField", 1, 100);
      expect(result.valid).toBe(true);
    });

    it("should accept string with numbers", () => {
      const result = validateString("test123", "TestField", 1, 100);
      expect(result.valid).toBe(true);
    });

    it("should accept string with newlines (not null byte)", () => {
      const result = validateString("line1\nline2\nline3", "TestField", 1, 100);
      expect(result.valid).toBe(true);
    });

    it("should accept string with tabs", () => {
      const result = validateString("column1\tcolumn2", "TestField", 1, 100);
      expect(result.valid).toBe(true);
    });
  });
});

describe("validation - validateAction", () => {
  it("should use correct limits for action", () => {
    const result = validateAction("valid action");
    expect(result.valid).toBe(true);
  });

  it("should reject action longer than ACTION_MAX_LENGTH", () => {
    const longAction = "a".repeat(VALIDATION_LIMITS.ACTION_MAX_LENGTH + 1);
    const result = validateAction(longAction);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("cannot exceed 5000 characters");
  });

  it("should accept action at ACTION_MAX_LENGTH", () => {
    const longAction = "a".repeat(VALIDATION_LIMITS.ACTION_MAX_LENGTH);
    const result = validateAction(longAction);
    expect(result.valid).toBe(true);
  });

  it("should reject empty action", () => {
    const result = validateAction("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Action cannot be empty");
  });

  it("should reject non-string action", () => {
    const result = validateAction(123);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Action must be a string");
  });

  it("should reject action with null byte", () => {
    const result = validateAction("test\0action");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Action contains invalid characters");
  });
});

describe("validation - validateGuideline", () => {
  it("should use correct limits for guideline", () => {
    const result = validateGuideline("valid guideline");
    expect(result.valid).toBe(true);
  });

  it("should reject guideline longer than GUIDELINE_MAX_LENGTH", () => {
    const longGuideline = "a".repeat(
      VALIDATION_LIMITS.GUIDELINE_MAX_LENGTH + 1
    );
    const result = validateGuideline(longGuideline);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("cannot exceed 5000 characters");
  });

  it("should accept guideline at GUIDELINE_MAX_LENGTH", () => {
    const longGuideline = "a".repeat(VALIDATION_LIMITS.GUIDELINE_MAX_LENGTH);
    const result = validateGuideline(longGuideline);
    expect(result.valid).toBe(true);
  });

  it("should reject empty guideline", () => {
    const result = validateGuideline("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Guideline cannot be empty");
  });

  it("should reject non-string guideline", () => {
    const result = validateGuideline({ foo: "bar" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Guideline must be a string");
  });

  it("should reject guideline with null byte", () => {
    const result = validateGuideline("test\0guideline");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Guideline contains invalid characters");
  });
});

describe("validation - sanitizeInput", () => {
  it("should trim leading whitespace", () => {
    expect(sanitizeInput("   test")).toBe("test");
  });

  it("should trim trailing whitespace", () => {
    expect(sanitizeInput("test   ")).toBe("test");
  });

  it("should trim both leading and trailing whitespace", () => {
    expect(sanitizeInput("   test   ")).toBe("test");
  });

  it("should collapse multiple spaces to single space", () => {
    expect(sanitizeInput("test    string")).toBe("test string");
  });

  it("should collapse multiple spaces in multiple places", () => {
    expect(sanitizeInput("test    string    with    spaces")).toBe(
      "test string with spaces"
    );
  });

  it("should convert tabs to single space", () => {
    expect(sanitizeInput("test\tstring")).toBe("test string");
  });

  it("should convert multiple tabs to single space", () => {
    expect(sanitizeInput("test\t\t\tstring")).toBe("test string");
  });

  it("should convert newlines to single space", () => {
    expect(sanitizeInput("test\nstring")).toBe("test string");
  });

  it("should convert multiple newlines to single space", () => {
    expect(sanitizeInput("test\n\n\nstring")).toBe("test string");
  });

  it("should handle mixed whitespace", () => {
    expect(sanitizeInput("test \t\n string")).toBe("test string");
  });

  it("should handle empty string", () => {
    expect(sanitizeInput("")).toBe("");
  });

  it("should handle whitespace-only string", () => {
    expect(sanitizeInput("   \t\n   ")).toBe("");
  });

  it("should preserve single spaces", () => {
    expect(sanitizeInput("test string with spaces")).toBe(
      "test string with spaces"
    );
  });

  it("should handle string with only whitespace types", () => {
    expect(sanitizeInput(" \t\n\r ")).toBe("");
  });

  it("should handle complex real-world input", () => {
    expect(
      sanitizeInput("  Closed    ticket\n#123   and   sent\temail  ")
    ).toBe("Closed ticket #123 and sent email");
  });
});
