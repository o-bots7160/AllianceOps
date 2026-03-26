'use client';

import { useState } from 'react';
import { getApiBase } from '../../lib/api-base';
import { StatusBanner } from '../status-banner';

interface JoinTeamSectionProps {
  setError: (error: string | null) => void;
  onJoined: () => Promise<void>;
}

export function JoinTeamSection({ setError, onJoined }: JoinTeamSectionProps) {
  const [joinCode, setJoinCode] = useState('');
  const [requestTeamNumber, setRequestTeamNumber] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleJoinViaCode() {
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/teams/join/${joinCode}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      setJoinCode('');
      await onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

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
      setSuccessMessage('Join request submitted! A coach or mentor will review it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <>
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
        {successMessage && (
          <StatusBanner
            variant="success"
            dismissible
            onDismiss={() => setSuccessMessage(null)}
          >
            <p className="text-sm">{successMessage}</p>
          </StatusBanner>
        )}
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
    </>
  );
}
