'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getApiBase } from '../lib/api-base';

interface TeamMembership {
  teamId: string;
  teamNumber: number;
  name: string;
  role: 'COACH' | 'MENTOR' | 'STUDENT';
}

interface AuthUserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  teams: TeamMembership[];
}

interface AuthContextValue {
  user: AuthUserProfile | null;
  loading: boolean;
  error: string | null;
  activeTeam: TeamMembership | null;
  setActiveTeamId: (teamId: string) => void;
  refetch: () => Promise<void>;
}

const ACTIVE_TEAM_KEY = 'allianceops-active-team';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null);

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
      setUser(result.data);

      // Restore active team from localStorage, or default to first team
      const storedTeamId = localStorage.getItem(ACTIVE_TEAM_KEY);
      const teams: TeamMembership[] = result.data.teams ?? [];
      if (storedTeamId && teams.some((t: TeamMembership) => t.teamId === storedTeamId)) {
        setActiveTeamIdState(storedTeamId);
      } else if (teams.length > 0) {
        setActiveTeamIdState(teams[0].teamId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const setActiveTeamId = useCallback(
    (teamId: string) => {
      setActiveTeamIdState(teamId);
      localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
    },
    [],
  );

  const activeTeam = user?.teams.find((t) => t.teamId === activeTeamId) ?? null;

  const value: AuthContextValue = {
    user,
    loading,
    error,
    activeTeam,
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
