import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { getAuthProvider, type AuthUser } from '@allianceops/shared';
import { prisma } from './prisma.js';
import { trackAuthEvent } from './telemetry.js';
import type { TeamRole } from '@prisma/client';

/** Role hierarchy for permission checks (higher index = more privilege). */
const ROLE_RANK: Record<TeamRole, number> = {
  STUDENT: 0,
  MENTOR: 1,
  COACH: 2,
};

/** Extract headers from Azure Functions HttpRequest into a plain record. */
function extractHeaders(request: HttpRequest): Record<string, string | undefined> {
  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return headers;
}

/**
 * Resolve the current user from request headers.
 * Returns null if not authenticated. Upserts User record in database.
 */
export async function resolveUser(request: HttpRequest): Promise<AuthUser | null> {
  const provider = getAuthProvider();
  const headers = extractHeaders(request);
  const authUser = await provider.validateRequest(headers);

  if (!authUser) {
    const principalBlob = headers['x-ms-client-principal'];
    const principalId = headers['x-ms-client-principal-id'];
    const principalIdp = headers['x-ms-client-principal-idp'];
    trackAuthEvent('missing_headers', {
      hasPrincipalBlob: String(!!principalBlob),
      blobLength: String(principalBlob?.length ?? 0),
      hasPrincipalId: String(!!principalId),
      identityProvider: principalIdp ?? 'none',
      url: request.url,
    });
    return null;
  }

  trackAuthEvent('success', { identityId: authUser.id, url: request.url });

  // Upsert user record in the database
  try {
    await prisma.user.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email: authUser.email ?? null,
        displayName: authUser.displayName ?? null,
      },
      update: {
        email: authUser.email ?? null,
        displayName: authUser.displayName ?? null,
      },
    });
  } catch (err) {
    // Log but don't crash — the user is authenticated even if the DB
    // upsert fails (e.g., schema drift, connection issue). The caller
    // can still use the AuthUser for basic auth checks.
    console.error('User upsert failed:', {
      id: authUser.id,
      email: authUser.email,
      displayName: authUser.displayName,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return authUser;
}

/**
 * Require an authenticated user. Returns 401 response if not authenticated.
 */
export async function requireUser(request: HttpRequest): Promise<AuthUser | HttpResponseInit> {
  const user = await resolveUser(request);
  if (!user) {
    return { status: 401, jsonBody: { error: 'Authentication required' } };
  }
  return user;
}

/**
 * Require the user to be a member of the specified team.
 * Returns 401 if not authenticated, 403 if not a member.
 */
export async function requireTeamMember(
  request: HttpRequest,
  teamId: string,
): Promise<{ user: AuthUser; role: TeamRole } | HttpResponseInit> {
  const result = await requireUser(request);
  if (isAuthError(result)) return result;

  const member = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: result.id, teamId } },
  });

  if (!member) {
    return { status: 403, jsonBody: { error: 'Team membership required' } };
  }

  return { user: result, role: member.role };
}

/** Type guard: check if auth result is an error response. */
export function isAuthError(
  result: { user: AuthUser; role: TeamRole } | AuthUser | HttpResponseInit,
): result is HttpResponseInit {
  return result !== null && typeof result === 'object' && 'status' in result && !('id' in result);
}

/**
 * Require the user to have at least the specified role in the team.
 * Returns 401 if not authenticated, 403 if insufficient role.
 */
export async function requireTeamRole(
  request: HttpRequest,
  teamId: string,
  minRole: TeamRole,
): Promise<{ user: AuthUser; role: TeamRole } | HttpResponseInit> {
  const result = await requireTeamMember(request, teamId);
  if (isAuthError(result)) return result;

  if (ROLE_RANK[result.role] < ROLE_RANK[minRole]) {
    return { status: 403, jsonBody: { error: `Requires ${minRole} role or higher` } };
  }

  return result;
}
