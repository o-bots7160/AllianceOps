'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getApiBase } from '@/lib/api-base';
import { useAuth } from '@/components/use-auth';
import { useSignalR } from '@/hooks/use-signalr';
import type { ScoutingSummary } from '@allianceops/shared';

/**
 * Lightweight hook that fetches scouting summaries for an event.
 * Returns a Map<teamNumber, ScoutingSummary> for easy lookup.
 * Listens for `scouting-updated` SignalR events to auto-refresh.
 * Used by picklist and briefing pages to show scouting indicators in TeamCard.
 */
export function useScoutingSummaries(eventKey: string) {
  const { user, activeTeam } = useAuth();
  const teamId = activeTeam?.teamId ?? null;
  const [summaries, setSummaries] = useState<ScoutingSummary[]>([]);

  const API_BASE = getApiBase();

  const load = useCallback(async () => {
    if (!eventKey || !teamId) return;
    try {
      const res = await fetch(`${API_BASE}/teams/${teamId}/event/${eventKey}/scouting`, {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const json = await res.json();
        setSummaries(json.data ?? []);
      }
    } catch {
      // Silently fail
    }
  }, [eventKey, teamId, API_BASE]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-reload when a teammate saves scouting notes
  const signalR = useSignalR(!!user);

  useEffect(() => {
    if (signalR.state !== 'connected') return;

    const handler = (...args: unknown[]) => {
      const msg = args[0] as { type?: string; eventKey?: string; userId?: string } | undefined;
      if (msg?.type !== 'scouting-updated') return;
      if (msg.eventKey && msg.eventKey !== eventKey) return;
      if (user && msg.userId === user.id) return;
      load();
    };

    signalR.on('scouting-updated', handler);
    return () => signalR.off('scouting-updated', handler);
  }, [signalR, eventKey, user, load]);

  const summaryMap = useMemo(() => {
    const map = new Map<number, ScoutingSummary>();
    for (const s of summaries) map.set(s.targetTeamNumber, s);
    return map;
  }, [summaries]);

  return { summaryMap, reload: load };
}
