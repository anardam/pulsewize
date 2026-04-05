type LogLevel = "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  route?: string;
  userId?: string;
  platform?: string;
  connectedAccountId?: string;
  username?: string;
  [key: string]: unknown;
}

function sanitizeContext(context: LogContext = {}): Record<string, unknown> {
  const entries = Object.entries(context).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries);
}

function emit(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeContext(context),
  };

  const serialized = JSON.stringify(payload);
  if (level === "error") {
    console.error(serialized);
    return;
  }
  if (level === "warn") {
    console.warn(serialized);
    return;
  }
  console.log(serialized);
}

export function logInfo(message: string, context?: LogContext) {
  emit("info", message, context);
}

export function logError(
  message: string,
  error?: unknown,
  context: LogContext = {}
) {
  const normalizedError =
    error instanceof Error
      ? {
          errorName: error.name,
          errorMessage: error.message,
        }
      : error
        ? { errorMessage: String(error) }
        : {};

  emit("error", message, {
    ...context,
    ...normalizedError,
  });
}

export function createRequestId(): string {
  return crypto.randomUUID();
}
