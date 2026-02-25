/** Pluggable auth abstraction */

export type UserRole = 'viewer' | 'editor';

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  role: UserRole;
}

export interface AuthProvider {
  validateRequest(headers: Record<string, string | undefined>): Promise<AuthUser | null>;
}

/** Options for SWAAuthProvider. */
export interface SWAAuthProviderOptions {
  /** Called when blob parsing fails or produces unexpected data. */
  onError?: (error: string, details: Record<string, string>) => void;
}

/**
 * Azure Static Web Apps EasyAuth provider.
 * Decodes the x-ms-client-principal base64 blob forwarded by SWA to linked backends.
 * Also reads the individual x-ms-client-principal-id/name headers (available in managed APIs).
 */
export class SWAAuthProvider implements AuthProvider {
  private onError?: SWAAuthProviderOptions['onError'];

  constructor(options?: SWAAuthProviderOptions) {
    this.onError = options?.onError;
  }

  async validateRequest(headers: Record<string, string | undefined>): Promise<AuthUser | null> {
    // Primary path: decode x-ms-client-principal base64 blob.
    // This is forwarded to linked backends and by SWA CLI.
    const principalBlob = headers['x-ms-client-principal'];
    if (principalBlob) {
      try {
        const decoded = JSON.parse(Buffer.from(principalBlob, 'base64').toString('utf-8'));
        if (decoded.userId) {
          // Reject anonymous/system identities that SWA may forward for
          // unauthenticated requests on routes with allowedRoles: ["anonymous"]
          if (decoded.userId === 'anonymous' || decoded.identityProvider === 'anonymous') {
            return null;
          }

          // Extract email from claims if available
          const emailClaim = decoded.claims?.find(
            (c: { typ: string; val: string }) =>
              c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress' ||
              c.typ === 'preferred_username' ||
              c.typ === 'email',
          );
          return {
            id: decoded.userId,
            email: emailClaim?.val || decoded.userDetails || undefined,
            displayName: decoded.userDetails || 'Unknown',
            role: 'editor',
          };
        }
        // Blob decoded but no userId present
        this.onError?.('blob_missing_userId', {
          identityProvider: decoded.identityProvider ?? 'unknown',
          hasUserDetails: String(!!decoded.userDetails),
          claimCount: String(decoded.claims?.length ?? 0),
        });
      } catch (e) {
        this.onError?.('blob_parse_error', {
          error: e instanceof Error ? e.message : String(e),
          blobLength: String(principalBlob.length),
        });
      }
    }

    // Fallback: individual headers (only available in managed APIs, not linked backends)
    const principalId = headers['x-ms-client-principal-id'];
    const principalName = headers['x-ms-client-principal-name'];

    if (principalId && principalId !== 'anonymous') {
      return {
        id: principalId,
        displayName: principalName ?? 'Unknown',
        role: 'editor',
      };
    }

    return null;
  }
}

let currentProvider: AuthProvider = new SWAAuthProvider();

export function setAuthProvider(provider: AuthProvider): void {
  currentProvider = provider;
}

export function getAuthProvider(): AuthProvider {
  return currentProvider;
}
