'use client';

import { useState } from 'react';
import { useAuth } from '../../components/use-auth';
import { getApiBase } from '../../lib/api-base';

type TeamDetail = {
  id: string;
  teamNumber: number;
  name: string;
  members: Array<{
    id: string;
    role: 'COACH' | 'MENTOR' | 'STUDENT';
    user: { id: string; displayName: string | null; email: string | null };
  }>;
};

type JoinRequestItem = {
  id: string;
  status: string;
  createdAt: string;
  user: { id: string; displayName: string | null; email: string | null };
};

export default function TeamPage() {
  const { user, activeTeam, setActiveTeamId, loading: authLoading, refetch } = useAuth();
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Create Team ──────────────────────────────────────
  const [createNumber, setCreateNumber] = useState('');
  const [createName, setCreateName] = useState('');

  async function handleCreateTeam() {
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamNumber: parseInt(createNumber, 10), name: createName }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      setCreateNumber('');
      setCreateName('');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // ─── Join via Code ────────────────────────────────────
  const [joinCode, setJoinCode] = useState('');

  async function handleJoinViaCode() {
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/teams/join/${joinCode}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      setJoinCode('');
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // ─── Join Request by Team Number ──────────────────────
  const [requestTeamNumber, setRequestTeamNumber] = useState('');

  async function handleJoinRequest() {
    setError(null);
    try {
      const lookupRes = await fetch(`${getApiBase()}/teams/lookup/${requestTeamNumber}`);
      if (!lookupRes.ok) throw new Error('Team not found');
      const { data: team } = await lookupRes.json();

      const res = await fetch(`${getApiBase()}/teams/${team.id}/join-request`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      setRequestTeamNumber('');
      setError(null);
      alert('Join request submitted! A coach or mentor will review it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // ─── Load Team Detail ─────────────────────────────────
  async function loadTeamDetail(teamId: string) {
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
  }

  // ─── Generate Invite Code ─────────────────────────────
  async function handleGenerateInvite() {
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
  }

  // ─── Review Join Request ──────────────────────────────
  async function handleReviewRequest(requestId: string, action: 'approve' | 'reject') {
    if (!activeTeam) return;
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/teams/${activeTeam.teamId}/join-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      if (activeTeam) await loadTeamDetail(activeTeam.teamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // ─── Change Member Role ───────────────────────────────
  async function handleChangeRole(userId: string, newRole: 'COACH' | 'MENTOR' | 'STUDENT') {
    if (!activeTeam) return;
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/teams/${activeTeam.teamId}/members/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      await loadTeamDetail(activeTeam.teamId);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // ─── Remove Member ────────────────────────────────────
  async function handleRemoveMember(userId: string, displayName: string) {
    if (!activeTeam) return;
    if (!confirm(`Remove ${displayName} from the team?`)) return;
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/teams/${activeTeam.teamId}/members/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      await loadTeamDetail(activeTeam.teamId);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (authLoading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;
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
  const isCoachOrMentor = activeTeam && (activeTeam.role === 'COACH' || activeTeam.role === 'MENTOR');
  const isCoach = activeTeam?.role === 'COACH';

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Team Management</h2>
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
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
                className={`text-left p-4 rounded border transition-colors ${activeTeam?.teamId === t.teamId
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
      {activeTeam && teamDetail && !detailLoading && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">
            Team {teamDetail.teamNumber} — {teamDetail.name}
          </h3>

          {/* Members */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Members ({teamDetail.members.length})
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-1">Name</th>
                  <th className="py-1">Role</th>
                  {isCoachOrMentor && <th className="py-1 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {teamDetail.members.map((m) => {
                  const name = m.user.displayName || m.user.email || m.user.id;
                  const isSelf = m.user.id === user.id;

                  return (
                    <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2">
                        {name}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">
                            (you)
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        {isCoach && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleChangeRole(
                                m.user.id,
                                e.target.value as 'COACH' | 'MENTOR' | 'STUDENT',
                              )
                            }
                            className="px-2 py-0.5 rounded text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                          >
                            <option value="COACH">COACH</option>
                            <option value="MENTOR">MENTOR</option>
                            <option value="STUDENT">STUDENT</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800">
                            {m.role}
                          </span>
                        )}
                      </td>
                      {isCoachOrMentor && (
                        <td className="py-2 text-right">
                          {!isSelf &&
                            (isCoach || m.role === 'STUDENT') && (
                              <button
                                onClick={() => handleRemoveMember(m.user.id, name)}
                                className="px-2 py-0.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Invite Code (Coach/Mentor only) */}
          {isCoachOrMentor && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invite Code</h4>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateInvite}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Generate Invite Code
                </button>
                {inviteCode && (
                  <span className="font-mono text-lg font-bold text-primary-600 dark:text-primary-400">
                    {inviteCode}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Join Requests (Coach/Mentor only) */}
          {isCoachOrMentor && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Pending Join Requests
              </h4>
              {joinRequests.length > 0 ? (
                joinRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded"
                  >
                    <span>{r.user.displayName || r.user.email || r.user.id}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewRequest(r.id, 'approve')}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewRequest(r.id, 'reject')}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">No pending requests.</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Create / Join ────────────────────────────────── */}
      <section className="space-y-6">
        <h3 className="text-lg font-semibold">
          {hasTeams ? 'Create or Join Another Team' : 'Get Started'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create Team */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded space-y-3">
            <h4 className="font-medium">Create a Team</h4>
            <input
              type="number"
              placeholder="Team Number"
              value={createNumber}
              onChange={(e) => setCreateNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
            />
            <input
              type="text"
              placeholder="Team Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
            />
            <button
              onClick={handleCreateTeam}
              disabled={!createNumber || !createName}
              className="w-full px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              Create Team
            </button>
          </div>

          {/* Join via Code */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded space-y-3">
            <h4 className="font-medium">Join via Invite Code</h4>
            <input
              type="text"
              placeholder="Enter invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm font-mono"
            />
            <button
              onClick={handleJoinViaCode}
              disabled={!joinCode}
              className="w-full px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              Join Team
            </button>
          </div>

          {/* Request to Join */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded space-y-3">
            <h4 className="font-medium">Request to Join</h4>
            <input
              type="number"
              placeholder="Team Number"
              value={requestTeamNumber}
              onChange={(e) => setRequestTeamNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
            />
            <button
              onClick={handleJoinRequest}
              disabled={!requestTeamNumber}
              className="w-full px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              Request to Join
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
