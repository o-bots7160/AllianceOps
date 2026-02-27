/**
 * Forge x-ms-client-principal headers that match the SWAAuthProvider decode logic.
 * Used to simulate authenticated requests against the Function App without SWA proxy.
 */

export interface ForgeAuthOptions {
  userId: string;
  userDetails: string;
  identityProvider?: string;
  userRoles?: string[];
  claims?: Array<{ typ: string; val: string }>;
}

export interface AuthPersona {
  userId: string;
  userDetails: string;
  identityProvider: string;
}

/** Pre-built test personas with stable IDs */
export const PERSONAS = {
  COACH_7160: {
    userId: 'test-coach-7160',
    userDetails: 'coach7160@test.allianceops.io',
    identityProvider: 'github',
  },
  COACH_6328: {
    userId: 'test-coach-6328',
    userDetails: 'coach6328@test.allianceops.io',
    identityProvider: 'github',
  },
  MENTOR_7160: {
    userId: 'test-mentor-7160',
    userDetails: 'mentor7160@test.allianceops.io',
    identityProvider: 'github',
  },
  STUDENT_7160: {
    userId: 'test-student-7160',
    userDetails: 'student7160@test.allianceops.io',
    identityProvider: 'github',
  },
  UNAUTHED_USER: {
    userId: 'test-no-team',
    userDetails: 'noteam@test.allianceops.io',
    identityProvider: 'github',
  },
} as const;

/**
 * Build a base64-encoded x-ms-client-principal blob matching SWAAuthProvider expectations.
 */
export function forgeAuthHeader(options: ForgeAuthOptions): Record<string, string> {
  const blob = {
    userId: options.userId,
    userDetails: options.userDetails,
    identityProvider: options.identityProvider ?? 'github',
    userRoles: options.userRoles ?? ['authenticated'],
    claims: options.claims ?? [
      {
        typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        val: options.userDetails,
      },
    ],
  };

  const encoded = Buffer.from(JSON.stringify(blob)).toString('base64');
  return { 'x-ms-client-principal': encoded };
}

/**
 * Build auth headers for a pre-defined persona.
 */
export function authAs(persona: AuthPersona): Record<string, string> {
  return forgeAuthHeader({
    userId: persona.userId,
    userDetails: persona.userDetails,
    identityProvider: persona.identityProvider,
  });
}

/**
 * Return empty headers (anonymous / unauthenticated request).
 */
export function anonymous(): Record<string, string> {
  return {};
}
