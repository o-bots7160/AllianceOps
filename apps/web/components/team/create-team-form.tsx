'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBase } from '../../lib/api-base';

interface CreateTeamFormProps {
  setError: (error: string | null) => void;
  onCreated: () => Promise<void>;
}

export function CreateTeamForm({ setError, onCreated }: CreateTeamFormProps) {
  const [createNumber, setCreateNumber] = useState('');
  const [createName, setCreateName] = useState('');
  const [nameLookupLoading, setNameLookupLoading] = useState(false);
  const [nameWasAutoFilled, setNameWasAutoFilled] = useState(false);
  const nameLookupRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const lookupTeamName = useCallback(async (num: string) => {
    const parsed = parseInt(num, 10);
    if (!parsed || parsed <= 0) return;
    setNameLookupLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/team/${parsed}/info`);
      if (res.ok) {
        const result = await res.json();
        const nickname = result?.data?.nickname;
        if (nickname) {
          setCreateName(nickname);
          setNameWasAutoFilled(true);
        }
      }
    } catch {
      // Lookup failed — leave name field editable
    } finally {
      setNameLookupLoading(false);
    }
  }, []);

  function handleCreateNumberChange(value: string) {
    setCreateNumber(value);
    if (nameWasAutoFilled) {
      setCreateName('');
      setNameWasAutoFilled(false);
    }
    if (nameLookupRef.current) clearTimeout(nameLookupRef.current);
    const parsed = parseInt(value, 10);
    if (parsed && parsed > 0) {
      nameLookupRef.current = setTimeout(() => lookupTeamName(value), 500);
    } else {
      setNameLookupLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (nameLookupRef.current) clearTimeout(nameLookupRef.current);
    };
  }, []);

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
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded space-y-3">
      <h4 className="font-medium">Create a Team</h4>
      <input
        type="number"
        placeholder="Team Number"
        value={createNumber}
        onChange={(e) => handleCreateNumberChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
      />
      <div className="relative">
        <input
          type="text"
          placeholder={nameLookupLoading ? 'Looking up team name...' : 'Team Name'}
          value={createName}
          onChange={(e) => {
            setCreateName(e.target.value);
            setNameWasAutoFilled(false);
          }}
          disabled={nameLookupLoading}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm disabled:opacity-50 disabled:cursor-wait"
        />
        {nameLookupLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-primary-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
      <button
        onClick={handleCreateTeam}
        disabled={!createNumber || !createName}
        className="w-full px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
      >
        Create Team
      </button>
    </div>
  );
}
