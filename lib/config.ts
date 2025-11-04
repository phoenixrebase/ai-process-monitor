import type { Config } from "./types";

export function validateEnvironment(): void {
  const required = [
    "POSTGRES_URL",
    "HF_API_TOKEN",
    "API_URL",
  ] as const;

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        `Please check your .env.local file and ensure all required variables are set.\n` +
        `See .env.example for required variables.`
    );
  }

  const postgresUrl = process.env.POSTGRES_URL!;
  if (!postgresUrl.startsWith("postgresql://") && !postgresUrl.startsWith("postgres://")) {
    throw new Error(
      "POSTGRES_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://"
    );
  }

  const apiUrl = process.env.API_URL!;
  if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
    throw new Error("API_URL must be a valid HTTP or HTTPS URL");
  }

  const apiToken = process.env.HF_API_TOKEN!;
  if (!apiToken.startsWith("hf_")) {
    throw new Error(
      "HF_API_TOKEN appears to be invalid (must start with 'hf_'). " +
      "Get your token from https://huggingface.co/settings/tokens"
    );
  }

  if (apiToken.length < 20) {
    throw new Error(
      "HF_API_TOKEN appears to be invalid (too short). " +
      "Valid HuggingFace tokens are typically 37-40 characters long."
    );
  }

  if (!/^hf_[a-zA-Z0-9]{16,}$/.test(apiToken)) {
    throw new Error(
      "HF_API_TOKEN appears to be invalid (contains invalid characters). " +
      "Token should only contain alphanumeric characters after 'hf_' prefix."
    );
  }
}

export function getConfig(): Config {
  return {
    postgres: {
      url: process.env.POSTGRES_URL!,
    },
    huggingface: {
      apiToken: process.env.HF_API_TOKEN!,
      apiUrl: process.env.API_URL!,
    },
    app: {
      nodeEnv: process.env.NODE_ENV || "development",
      isDevelopment: process.env.NODE_ENV === "development",
      isProduction: process.env.NODE_ENV === "production",
    },
  };
}

if (typeof window === "undefined") {
  try {
    validateEnvironment();
  } catch (error) {
    console.error("❌ Environment validation failed:");
    console.error((error as Error).message);
    process.exit(1);
  }
}
