/**
 * Centralized API error handling for consistent error responses.
 * Use apiError() for explicit errors, handleApiError() in catch blocks.
 */
import { NextResponse } from 'next/server';

/** Standard HTTP status codes used by API routes */
export const API_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  UNAVAILABLE: 503,
} as const;

export type ApiStatus = (typeof API_STATUS)[keyof typeof API_STATUS];

/** Extras merged into the JSON body (e.g. retryAfter, requiresPassword, success) */
type ApiErrorExtras = Record<string, string | number | boolean | null | undefined>;

/**
 * Return a JSON error response with consistent shape.
 * @param message - Error message (exposed to client)
 * @param status - HTTP status code (default 500)
 * @param extras - Additional fields merged into the response body (e.g. { retryAfter: 60 })
 */
export function apiError(
  message: string,
  status: ApiStatus | number = API_STATUS.INTERNAL_ERROR,
  extras?: ApiErrorExtras
): NextResponse {
  const body = { error: message, ...extras };
  const headers: HeadersInit = {};
  if (typeof extras?.retryAfter === 'number') {
    headers['Retry-After'] = String(extras.retryAfter);
  }
  return NextResponse.json(body, { status, headers });
}

/**
 * Handle unexpected errors in catch blocks. Logs and returns a 500 response.
 * @param e - Caught error
 * @param options - context: log prefix; publicMessage: override for client (default generic)
 */
export function handleApiError(
  e: unknown,
  options?: { context?: string; publicMessage?: string }
): NextResponse {
  const { context, publicMessage } = options ?? {};
  const prefix = context ? `[CHECKION] ${context}: ` : '[CHECKION] ';
  console.error(prefix, e);
  const message = publicMessage ?? 'An unexpected error occurred.';
  return apiError(message, API_STATUS.INTERNAL_ERROR);
}

/**
 * Wrapper for a generic internal/server error with a safe public message.
 * Use when you want a fixed message instead of exposing the actual error.
 */
export function internalError(publicMessage = 'An unexpected error occurred.'): NextResponse {
  return apiError(publicMessage, API_STATUS.INTERNAL_ERROR);
}
