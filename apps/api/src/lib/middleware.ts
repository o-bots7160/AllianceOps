import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { AuthUser } from '@allianceops/shared';
import type { TeamRole } from '@prisma/client';
import type { z } from 'zod';
import { requireUser, requireAdmin, requireTeamRole, isAuthError } from './auth.js';
import { parseBody, isValidationError, requiredParam, isParamError } from './validation.js';

// ─── Handler Signatures ──────────────────────────────────

export type AuthenticatedHandler = (
  request: HttpRequest,
  context: InvocationContext,
  user: AuthUser,
) => Promise<HttpResponseInit>;

export type AdminHandler = (
  request: HttpRequest,
  context: InvocationContext,
  user: AuthUser,
) => Promise<HttpResponseInit>;

export type TeamAuthHandler = (
  request: HttpRequest,
  context: InvocationContext,
  auth: { user: AuthUser; role: TeamRole },
  teamId: string,
) => Promise<HttpResponseInit>;

export type ValidatedHandler<T> = (
  request: HttpRequest,
  context: InvocationContext,
  body: T,
) => Promise<HttpResponseInit>;

// ─── Auth Middleware ──────────────────────────────────────

/**
 * Wrap a handler with authentication. Resolves the user (or admin) and
 * short-circuits with 401/403 on failure.
 */
export function withAuth(
  mode: 'user',
  handler: AuthenticatedHandler,
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;
export function withAuth(
  mode: 'admin',
  handler: AdminHandler,
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;
export function withAuth(
  mode: 'user' | 'admin',
  handler: AuthenticatedHandler | AdminHandler,
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request, context) => {
    if (mode === 'admin') {
      const result = await requireAdmin(request);
      if (isAuthError(result)) return result;
      return (handler as AdminHandler)(request, context, result.user);
    }

    const result = await requireUser(request);
    if (isAuthError(result)) return result;
    return (handler as AuthenticatedHandler)(request, context, result);
  };
}

// ─── Team Auth Middleware ─────────────────────────────────

/**
 * Wrap a handler with team-scoped authentication.
 * Extracts `teamId` from route params and verifies the user has at least `minRole`.
 */
export function withTeamAuth(
  minRole: TeamRole,
  handler: TeamAuthHandler,
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request, context) => {
    const teamId = requiredParam(request, 'teamId');
    if (isParamError(teamId)) return teamId;

    const result = await requireTeamRole(request, teamId, minRole);
    if (isAuthError(result)) return result;

    return handler(request, context, result, teamId);
  };
}

// ─── Validation Middleware ────────────────────────────────

/**
 * Wrap a handler with request body validation.
 * Parses the body against a Zod schema and short-circuits with 400 on failure.
 */
export function withValidation<S extends z.ZodType>(
  schema: S,
  handler: ValidatedHandler<z.infer<S>>,
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request, context) => {
    const body = await parseBody(request, schema);
    if (isValidationError(body)) return body;
    return handler(request, context, body as z.infer<S>);
  };
}
