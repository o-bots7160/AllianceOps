import type { HttpResponseInit } from '@azure/functions';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** 200 OK with data envelope and optional meta. */
export function ok(data: unknown, meta?: Record<string, unknown>): HttpResponseInit {
  return {
    status: 200,
    headers: JSON_HEADERS,
    jsonBody: meta ? { data, meta } : { data },
  };
}

/** 201 Created with data envelope. */
export function created(data: unknown): HttpResponseInit {
  return {
    status: 201,
    headers: JSON_HEADERS,
    jsonBody: { data },
  };
}

/** 204 No Content — empty response. */
export function noContent(): HttpResponseInit {
  return { status: 204 };
}

/** 400 Bad Request with error message and optional details. */
export function badRequest(message: string, details?: unknown): HttpResponseInit {
  return {
    status: 400,
    headers: JSON_HEADERS,
    jsonBody: details !== undefined ? { error: message, details } : { error: message },
  };
}

/** 401 Unauthorized. */
export function unauthorized(message = 'Authentication required'): HttpResponseInit {
  return {
    status: 401,
    headers: JSON_HEADERS,
    jsonBody: { error: message },
  };
}

/** 403 Forbidden. */
export function forbidden(message = 'Forbidden'): HttpResponseInit {
  return {
    status: 403,
    headers: JSON_HEADERS,
    jsonBody: { error: message },
  };
}

/** 404 Not Found. */
export function notFound(message = 'Not found'): HttpResponseInit {
  return {
    status: 404,
    headers: JSON_HEADERS,
    jsonBody: { error: message },
  };
}

/** 409 Conflict. */
export function conflict(message: string): HttpResponseInit {
  return {
    status: 409,
    headers: JSON_HEADERS,
    jsonBody: { error: message },
  };
}

/** 410 Gone. */
export function gone(message: string): HttpResponseInit {
  return {
    status: 410,
    headers: JSON_HEADERS,
    jsonBody: { error: message },
  };
}

/** 503 Service Unavailable with optional Retry-After header. */
export function serviceUnavailable(
  message = 'Service temporarily unavailable. Please try again.',
  retryAfter?: number,
): HttpResponseInit {
  return {
    status: 503,
    headers: retryAfter
      ? { ...JSON_HEADERS, 'Retry-After': String(retryAfter) }
      : JSON_HEADERS,
    jsonBody: { error: message },
  };
}
