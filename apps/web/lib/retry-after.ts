/**
 * Parses a Retry-After header value (RFC 9110) into milliseconds.
 * Handles both delay-seconds (e.g. "120") and HTTP-date strings
 * (e.g. "Fri, 31 Dec 1999 23:59:59 GMT"). Returns null when the
 * header is absent or unparseable.
 *
 * Date parsing is intentionally lenient — any string accepted by
 * `new Date()` is treated as a valid retry time, which is sufficient
 * for back-off scheduling purposes.
 */
export function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = parseInt(header, 10);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = new Date(header);
  if (!Number.isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
  return null;
}
