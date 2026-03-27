'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '../../components/use-auth';
import { getApiBase } from '../../lib/api-base';
import { LoadingSpinner } from '../../components/loading-spinner';
import { StatusBanner } from '../../components/status-banner';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { CreateTeamForm } from '../../components/team/create-team-form';
import { JoinTeamSection } from '../../components/team/join-team-section';
import { TeamDetail } from '../../components/team/team-detail';
import type { TeamDetail as TeamDetailType, JoinRequestItem, TeamMemberRole } from '../../components/team/types';

export default function TeamPage() {
  const { user, activeTeam, setActiveTeamId, loading: authLoading, refetch } = useAuth();
  const [teamDetail, setTeamDetail] = useState<TeamDetailType | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ─── Load Team Detail ─────────────────────────────────
  const loadTeamDetail = useCallback(async (teamId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const [teamRes, reqRes] = await Promise.all([
        fetch(`${getApiBase()}/teams/${teamId}`),
        fetch(`${getApiBase()}/teams/${teamId}/join-requests`),
      ]);
      if (teamRes.ok) {
        const { data } = await teamRes.json();
        setTeamDetail(data);
      }
      if (reqRes.ok) {
        const { data } = await reqRes.json();
        setJoinRequests(data);
      } else {
        setJoinRequests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ─── Generate Invite Code ─────────────────────────────
  const handleGenerateInvite = useCallback(async () => {
    if (!activeTeam) return;
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/teams/${activeTeam.teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      const { data } = await res.json();
      setInviteCode(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [activeTeam]);

  // ─── Review Join Request ──────────────────────────────
  const handleReviewRequest = useCallback(
    async (requestId: string, action: 'approve' | 'reject') => {
      if (!activeTeam) return;
      setError(null);
      try {
        const res = await fetch(
          `${getApiBase()}/teams/${activeTeam.teamId}/join-requests/${requestId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          },
        );
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || `Error ${res.status}`);
        }
        await loadTeamDetail(activeTeam.teamId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    [activeTeam, loadTeamDetail],
  );

  // ─── Change Member Role ───────────────────────────────
  const handleChangeRole = useCallback(
    async (userId: string, newRole: TeamMemberRole) => {
      if (!activeTeam) return;
      setError(null);
      try {
        const res = await fetch(
          `${getApiBase()}/teams/${activeTeam.teamId}/members/${userId}/role`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
          },
        );
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || `Error ${res.status}`);
        }
        await loadTeamDetail(activeTeam.teamId);
        await refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    [activeTeam, loadTeamDetail, refetch],
  );

  // ─── Remove Member ────────────────────────────────────
  const [removeConfirm, setRemoveConfirm] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);

  const handleRemoveMember = useCallback(
    async (userId: string, displayName: string) => {
      if (!activeTeam) return;
      setRemoveConfirm({ userId, displayName });
    },
    [activeTeam],
  );

  const executeRemoveMember = useCallback(async () => {
    if (!activeTeam || !removeConfirm) return;
    const { userId } = removeConfirm;
    setRemoveConfirm(null);
    setError(null);
    try {
      const res = await fetch(
        `${getApiBase()}/teams/${activeTeam.teamId}/members/${userId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      await loadTeamDetail(activeTeam.teamId);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [activeTeam, removeConfirm, loadTeamDetail, refetch]);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Log In Required</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Log in to create or join a team.
        </p>
      </div>
    );
  }

  const hasTeams = user.teams.length > 0;
  const isCoachOrMentor =
    activeTeam != null && (activeTeam.role === 'COACH' || activeTeam.role === 'MENTOR');
  const isCoach = activeTeam?.role === 'COACH';

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Team Management</h2>
      {error && (
        <StatusBanner variant="error" dismissible onDismiss={clearError}>
          {error}
        </StatusBanner>
      )}

      {/* ─── My Teams ─────────────────────────────────────── */}
      {hasTeams && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">My Teams</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {user.teams.map((t) => (
              <button
                key={t.teamId}
                onClick={() => {
                  setActiveTeamId(t.teamId);
                  loadTeamDetail(t.teamId);
                }}
                className={`text-left p-4 rounded border transition-colors ${
                  activeTeam?.teamId === t.teamId
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}
              >
                <div className="font-semibold">Team {t.teamNumber}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t.name}</div>
                <div className="text-xs mt-1 text-gray-500">
                  <span className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                    {t.role}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── Active Team Detail ───────────────────────────── */}
      {activeTeam && detailLoading && <LoadingSpinner message="Loading team details..." />}
      {activeTeam && teamDetail && !detailLoading && (
        <TeamDetail
          teamDetail={teamDetail}
          joinRequests={joinRequests}
          isCoachOrMentor={isCoachOrMentor}
          isCoach={isCoach}
          currentUserId={user.id}
          inviteCode={inviteCode}
          onGenerateInvite={handleGenerateInvite}
          onReviewRequest={handleReviewRequest}
          onChangeRole={handleChangeRole}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {/* ─── Create / Join ────────────────────────────────── */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold">
          {hasTeams ? 'Create or Join Another Team' : 'Get Started'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CreateTeamForm setError={setError} onCreated={refetch} />
          <JoinTeamSection setError={setError} onJoined={refetch} />
        </div>
      </section>

      {removeConfirm && (
        <ConfirmDialog
          open
          title="Remove Team Member"
          message={`Remove ${removeConfirm.displayName} from the team?`}
          confirmLabel="Remove"
          variant="danger"
          onConfirm={executeRemoveMember}
          onCancel={() => setRemoveConfirm(null)}
        />
      )}
    </div>
  );
}
