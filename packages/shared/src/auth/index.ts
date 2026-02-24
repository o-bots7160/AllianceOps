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

/**
 * Azure Static Web Apps EasyAuth provider.
 * SWA forwards auth headers: x-ms-client-principal-id, x-ms-client-principal-name
 * Also supports decoding the x-ms-client-principal base64 blob (used by SWA CLI).
 */
export class SWAAuthProvider implements AuthProvider {
  async validateRequest(
    headers: Record<string, string | undefined>,
  ): Promise<AuthUser | null> {
    const principalId = headers['x-ms-client-principal-id'];
    const principalName = headers['x-ms-client-principal-name'];

    if (principalId) {
      return {
        id: principalId,
        displayName: principalName ?? 'Unknown',
        role: 'editor',
      };
    }

    // Fallback: decode x-ms-client-principal base64 blob (SWA CLI sends this)
    const principalBlob = headers['x-ms-client-principal'];
    if (principalBlob) {
      try {
        const decoded = JSON.parse(Buffer.from(principalBlob, 'base64').toString('utf-8'));
        if (decoded.userId) {
          return {
            id: decoded.userId,
            displayName: decoded.userDetails || 'Unknown',
            role: 'editor',
          };
        }
      } catch {
        // Invalid blob — fall through to null
      }
    }

    return null;
  }
}

/**
 * Development auth provider — always returns an editor user.
 */
export class DevAuthProvider implements AuthProvider {
  async validateRequest(): Promise<AuthUser> {
    return {
      id: 'dev-user',
      displayName: 'Dev User',
      email: 'dev@allianceops.local',
      role: 'editor',
    };
  }
}

let currentProvider: AuthProvider = new DevAuthProvider();

export function setAuthProvider(provider: AuthProvider): void {
  currentProvider = provider;
}

export function getAuthProvider(): AuthProvider {
  return currentProvider;
}
