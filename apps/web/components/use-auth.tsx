'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getApiBase } from '../lib/api-base';
import { usePersistentState } from '../hooks/use-persistent-state';

export interface TeamMembership {
  teamId: string;
  teamNumber: number;
  name: string;
  role: 'COACH' | 'MENTOR' | 'STUDENT';
}

export interface AuthUserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  teams: TeamMembership[];
  isAdmin?: boolean;
}

interface AuthContextValue {
  user: AuthUserProfile | null;
  loading: boolean;
  error: string | null;
  activeTeam: TeamMembership | null;
  isAdmin: boolean;
  setActiveTeamId: (teamId: string) => void;
  refetch: () => Promise<void>;
}

const ACTIVE_TEAM_KEY = 'allianceops-active-team';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTeamId, setActiveTeamIdPersisted, activeTeamHydrated] =
    usePersistentState<string | null>(ACTIVE_TEAM_KEY, null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use redirect: 'manual' so SWA's 401→302 responseOverride doesn't
      // cause fetch to follow the redirect and return HTML instead of JSON.
      const response = await fetch(`${getApiBase()}/me`, { redirect: 'manual' });
      if (response.type === 'opaqueredirect' || response.status === 302) {
        // SWA converted 401 into a redirect to login — treat as unauthenticated
        setUser(null);
        return;
      }
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          return;
        }
        throw new Error(`API error: ${response.status}`);
      }
      const result = await response.json();
      const profile: AuthUserProfile | null = result.data ?? null;

      // Reject anonymous/system identities that slip through the API layer
      if (!profile || profile.id === 'anonymous' || !profile.id) {
        setUser(null);
        return;
      }

      setUser(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Validate persisted team ID against the user's actual teams
  useEffect(() => {
    if (!user || !activeTeamHydrated) return;
    const teams = user.teams;
    if (activeTeamId && teams.some((t) => t.teamId === activeTeamId)) return;
    if (teams.length > 0) {
      setActiveTeamIdPersisted(teams[0].teamId);
    }
  }, [user, activeTeamHydrated, activeTeamId, setActiveTeamIdPersisted]);

  const setActiveTeamId = useCallback(
    (teamId: string) => {
      setActiveTeamIdPersisted(teamId);
    },
    [setActiveTeamIdPersisted],
  );

  const activeTeam = user?.teams.find((t) => t.teamId === activeTeamId) ?? null;

  const value: AuthContextValue = {
    user,
    loading,
    error,
    activeTeam,
    isAdmin: user?.isAdmin === true,
    setActiveTeamId,
    refetch: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
