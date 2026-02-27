/**
 * k6 auth helper — forge x-ms-client-principal headers.
 * Compatible with k6's JavaScript runtime (not Node.js).
 */

import encoding from 'k6/encoding';

/**
 * Build a base64-encoded x-ms-client-principal blob.
 */
export function forgeAuthHeader(userId, userDetails, identityProvider) {
    var blob = {
        userId: userId,
        userDetails: userDetails,
        identityProvider: identityProvider || 'github',
        userRoles: ['authenticated'],
        claims: [
            {
                typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
                val: userDetails,
            },
        ],
    };

    var encoded = encoding.b64encode(JSON.stringify(blob));
    return { 'x-ms-client-principal': encoded };
}

export var COACH_7160_HEADERS = forgeAuthHeader(
    'test-coach-7160',
    'coach7160@test.allianceops.io',
    'github',
);

export var STUDENT_7160_HEADERS = forgeAuthHeader(
    'test-student-7160',
    'student7160@test.allianceops.io',
    'github',
);
