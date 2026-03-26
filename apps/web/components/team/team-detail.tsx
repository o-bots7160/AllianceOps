'use client';

import { useMemo } from 'react';
import { type ColumnDef, DataTable } from '../data-table';
import type { TeamDetail as TeamDetailType, JoinRequestItem, TeamMemberRole } from './types';

type TeamMember = TeamDetailType['members'][number];

interface TeamDetailProps {
  teamDetail: TeamDetailType;
  joinRequests: JoinRequestItem[];
  isCoachOrMentor: boolean;
  isCoach: boolean;
  currentUserId: string;
  inviteCode: string | null;
  onGenerateInvite: () => Promise<void>;
  onReviewRequest: (requestId: string, action: 'approve' | 'reject') => Promise<void>;
  onChangeRole: (userId: string, newRole: TeamMemberRole) => Promise<void>;
  onRemoveMember: (userId: string, displayName: string) => Promise<void>;
}

export function TeamDetail({
  teamDetail,
  joinRequests,
  isCoachOrMentor,
  isCoach,
  currentUserId,
  inviteCode,
  onGenerateInvite,
  onReviewRequest,
  onChangeRole,
  onRemoveMember,
}: TeamDetailProps) {
  const memberColumns = useMemo(() => {
    const cols: ColumnDef<TeamMember>[] = [
      {
        key: 'name',
        header: 'Name',
        render: (m) => {
          const name = m.user.displayName || m.user.email || m.user.id;
          const isSelf = m.user.id === currentUserId;
          return (
            <>
              {name}
              {isSelf && (
                <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">(you)</span>
              )}
            </>
          );
        },
      },
      {
        key: 'role',
        header: 'Role',
        render: (m) => {
          const isSelf = m.user.id === currentUserId;
          if (isCoach && !isSelf) {
            return (
              <select
                value={m.role}
                onChange={(e) => onChangeRole(m.user.id, e.target.value as TeamMemberRole)}
                className="px-2 py-0.5 rounded text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              >
                <option value="COACH">COACH</option>
                <option value="MENTOR">MENTOR</option>
                <option value="STUDENT">STUDENT</option>
              </select>
            );
          }
          return (
            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800">
              {m.role}
            </span>
          );
        },
      },
    ];

    if (isCoachOrMentor) {
      cols.push({
        key: 'actions',
        header: 'Actions',
        className: 'text-right',
        render: (m) => {
          const isSelf = m.user.id === currentUserId;
          const name = m.user.displayName || m.user.email || m.user.id;
          if (!isSelf && (isCoach || m.role === 'STUDENT')) {
            return (
              <button
                onClick={() => onRemoveMember(m.user.id, name)}
                className="px-2 py-0.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Remove
              </button>
            );
          }
          return null;
        },
      });
    }

    return cols;
  }, [isCoachOrMentor, isCoach, currentUserId, onChangeRole, onRemoveMember]);

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">
        Team {teamDetail.teamNumber} — {teamDetail.name}
      </h3>

      {/* Members */}
      <div>
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Members ({teamDetail.members.length})
        </h4>
        <DataTable
          data={teamDetail.members}
          columns={memberColumns}
          keyExtractor={(m) => m.id}
          emptyMessage="No members yet."
        />
      </div>

      {/* Invite Code (Coach/Mentor only) */}
      {isCoachOrMentor && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invite Code</h4>
          <div className="flex items-center gap-3">
            <button
              onClick={onGenerateInvite}
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
                    onClick={() => onReviewRequest(r.id, 'approve')}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReviewRequest(r.id, 'reject')}
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
  );
}
