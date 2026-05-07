export type ErrorCode =
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function mapHttpError(status: number, body: unknown): AppError {
  if (status === 401 || status === 403) {
    return new AppError("AUTH_ERROR", "Authentication failed with n8n API", body, status);
  }
  if (status === 404) {
    return new AppError("NOT_FOUND", "Resource not found in n8n API", body, status);
  }
  if (status === 429) {
    return new AppError("RATE_LIMIT", "Rate limit reached in n8n API", body, status);
  }
  if (status >= 400 && status < 500) {
    return new AppError("VALIDATION_ERROR", "Invalid request sent to n8n API", body, status);
  }
  return new AppError("UPSTREAM_ERROR", "n8n API upstream error", body, status);
}
