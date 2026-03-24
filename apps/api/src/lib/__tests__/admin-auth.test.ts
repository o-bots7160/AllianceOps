import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing auth
vi.mock('../prisma.js', () => ({
  prisma: {
    user: { upsert: vi.fn().mockResolvedValue({}) },
    adminUser: { findUnique: vi.fn() },
    teamMember: { findUnique: vi.fn() },
  },
}));

// Mock telemetry
vi.mock('../telemetry.js', () => ({
  trackAuthEvent: vi.fn(),
  trackException: vi.fn(),
}));

// Mock auth provider
vi.mock('@allianceops/shared', () => ({
  getAuthProvider: () => ({
    validateRequest: vi.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'editor',
    }),
  }),
}));

import { requireAdmin, isAuthError } from '../auth.js';
import { prisma } from '../prisma.js';
import type { HttpRequest } from '@azure/functions';

function makeRequest(headers: Record<string, string> = {}): HttpRequest {
  const headerMap = new Map(Object.entries(headers));
  return {
    headers: {
      forEach: (cb: (value: string, key: string) => void) => {
        headerMap.forEach((v, k) => cb(v, k));
      },
      get: (key: string) => headerMap.get(key) ?? null,
    },
    url: 'http://localhost:7071/api/site-admin/stats',
  } as unknown as HttpRequest;
}

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { user, isAdmin: true } for admin users', async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
      id: 'admin-record-id',
      userId: 'test-user-id',
      createdAt: new Date(),
    });

    const result = await requireAdmin(makeRequest());
    expect(isAuthError(result)).toBe(false);
    if (!isAuthError(result)) {
      expect(result.user.id).toBe('test-user-id');
      expect(result.isAdmin).toBe(true);
    }
  });

  it('returns 403 for non-admin users', async () => {
    vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null);

    const result = await requireAdmin(makeRequest());
    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(403);
    }
  });

  it('returns 503 on database error', async () => {
    vi.mocked(prisma.adminUser.findUnique).mockRejectedValue(new Error('DB connection failed'));

    const result = await requireAdmin(makeRequest());
    expect(isAuthError(result)).toBe(true);
    if (isAuthError(result)) {
      expect(result.status).toBe(503);
    }
  });
});

describe('isAuthError', () => {
  it('identifies admin success result as non-error', () => {
    const result = {
      user: { id: 'test', email: 'test@example.com', displayName: 'Test', role: 'editor' as const },
      isAdmin: true as const,
    };
    expect(isAuthError(result)).toBe(false);
  });

  it('identifies HTTP response as error', () => {
    const result = { status: 403, jsonBody: { error: 'Forbidden' } };
    expect(isAuthError(result)).toBe(true);
  });
});
