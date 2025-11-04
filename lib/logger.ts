import { getConfig } from "./config";
import type { LogLevel, LogContext } from "./types";

function formatLog(
  level: LogLevel,
  component: string,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}${contextStr}`;
}

class Logger {
  constructor(private component: string) {}

  info(message: string, context?: LogContext): void {
    console.log(formatLog("info", this.component, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(formatLog("warn", this.component, message, context));
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : String(error),
    };
    console.error(formatLog("error", this.component, message, errorContext));
  }

  debug(message: string, context?: LogContext): void {
    const { app: { isDevelopment } } = getConfig();
    if (isDevelopment) {
      console.debug(formatLog("debug", this.component, message, context));
    }
  }
}

export function createLogger(component: string): Logger {
  return new Logger(component);
}

export const apiLogger = createLogger("API");
export const dbLogger = createLogger("Database");
export const storeLogger = createLogger("Store");
export const hfLogger = createLogger("HuggingFace");
