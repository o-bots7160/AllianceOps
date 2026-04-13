'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useEventSetup } from '@/components/use-event-setup';
import { useAuth } from '@/components/use-auth';
import { useSignalR } from '@/hooks/use-signalr';
import { useAutosave } from '@/hooks/use-autosave';
import { getApiBase } from '@/lib/api-base';
import type { ScoutingEntry, ScoutingSummary, ScoutingStatus } from '@allianceops/shared';

export interface PastScoutingNote {
  eventKey: string;
  notes: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

const POLL_INTERVAL_MS = 30_000;

export function useScoutingData(selectedTeamNumber: number | null) {
  const { eventKey, year } = useEventSetup();
  const { user, activeTeam } = useAuth();
  const isOwnTeam = activeTeam !== null;
  const canEdit = isOwnTeam;
  const teamId = activeTeam?.teamId ?? null;

  // Summaries state
  const [summaries, setSummaries] = useState<ScoutingSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);

  // Individual note state
  const [notes, setNotes] = useState('');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [scoutingStatus, setScoutingStatus] = useState<ScoutingStatus>('not_scouted');
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean');
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();
  const [noteLoading, setNoteLoading] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [noteUpdatedAt, setNoteUpdatedAt] = useState<string | null>(null);
  const [noteUpdatedByName, setNoteUpdatedByName] = useState<string | null>(null);

  // Tag state (from picklist)
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagsDirty, setTagsDirty] = useState(false);

  // Past event import state
  const [pastNote, setPastNote] = useState<PastScoutingNote | null>(null);
  const [pastNoteChecked, setPastNoteChecked] = useState(false);

  const API_BASE = getApiBase();

  // --- Load summaries ---
  const loadSummaries = useCallback(async () => {
    if (!eventKey || !teamId) return;
    setSummariesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/teams/${teamId}/event/${eventKey}/scouting`, {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const json = await res.json();
        setSummaries(json.data ?? []);
      }
    } catch {
      // Silently fail — will retry on next poll
    } finally {
      setSummariesLoading(false);
    }
  }, [eventKey, teamId, API_BASE]);

  // Load summaries on mount and when event changes
  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  // Poll summaries every 30s when not dirty
  useEffect(() => {
    if (!eventKey || !teamId || dirty) return;
    const timer = setInterval(loadSummaries, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [eventKey, teamId, dirty, loadSummaries]);

  // --- Load tags from picklist ---
  const loadTags = useCallback(
    async (targetTeam: number) => {
      if (!eventKey || !teamId) return;
      try {
        const res = await fetch(
          `${API_BASE}/teams/${teamId}/event/${eventKey}/picklist/team/${targetTeam}/tags`,
          { credentials: 'same-origin' },
        );
        if (res.ok) {
          const json = await res.json();
          setTags(json.data?.tags ?? []);
          setAllTags(json.data?.allTags ?? []);
        }
      } catch {
        // Silently fail
      }
    },
    [eventKey, teamId, API_BASE],
  );

  // --- Load individual note ---
  const loadNote = useCallback(
    async (targetTeam: number) => {
      if (!eventKey || !teamId) return;
      setNoteLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/teams/${teamId}/event/${eventKey}/scouting/${targetTeam}`,
          { credentials: 'same-origin' },
        );
        if (res.ok) {
          const json = await res.json();
          const entry: ScoutingEntry | null = json.data;
          if (entry) {
            setNotes(entry.notes);
            setData(entry.data);
            setScoutingStatus(entry.scoutingStatus ?? 'not_scouted');
            setNoteUpdatedAt(entry.updatedAt ?? null);
            setNoteUpdatedByName(entry.updatedByName ?? null);
          } else {
            setNotes('');
            setData({});
            setScoutingStatus('not_scouted');
            setNoteUpdatedAt(null);
            setNoteUpdatedByName(null);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setNoteLoading(false);
        setDirty(false);
        setSaveStatus('clean');
      }
    },
    [eventKey, teamId, API_BASE],
  );

  // --- Check for past-event notes ---
  const checkPastNote = useCallback(
    async (targetTeam: number) => {
      if (!teamId || !year) {
        setPastNote(null);
        setPastNoteChecked(true);
        return;
      }
      try {
        const params = new URLSearchParams({ year: String(year) });
        if (eventKey) params.set('excludeEvent', eventKey);
        const res = await fetch(
          `${API_BASE}/teams/${teamId}/scouting/${targetTeam}/past?${params}`,
          { credentials: 'same-origin' },
        );
        if (res.ok) {
          const json = await res.json();
          setPastNote(json.data ?? null);
        } else {
          setPastNote(null);
        }
      } catch {
        setPastNote(null);
      } finally {
        setPastNoteChecked(true);
      }
    },
    [teamId, year, eventKey, API_BASE],
  );

  const importPastNote = useCallback(() => {
    if (!pastNote) return;
    setNotes(pastNote.notes);
    setData(typeof pastNote.data === 'object' && pastNote.data !== null ? pastNote.data : {});
    setDirty(true);
    setSaveStatus('dirty');
    setPastNote(null); // Hide the prompt after import
  }, [pastNote]);

  // Load note when selected team changes
  useEffect(() => {
    if (selectedTeamNumber) {
      loadNote(selectedTeamNumber);
      loadTags(selectedTeamNumber);
      checkPastNote(selectedTeamNumber);
    } else {
      setNotes('');
      setData({});
      setScoutingStatus('not_scouted');
      setTags([]);
      setTagsDirty(false);
      setDirty(false);
      setSaveStatus('clean');
      setPastNote(null);
      setPastNoteChecked(false);
      setNoteUpdatedAt(null);
      setNoteUpdatedByName(null);
    }
  }, [selectedTeamNumber, loadNote, loadTags, checkPastNote]);

  // --- Mark dirty on changes ---
  const updateNotes = useCallback((newNotes: string) => {
    setNotes(newNotes);
    setDirty(true);
    setSaveStatus('dirty');
  }, []);

  const updateScoutingStatus = useCallback((status: ScoutingStatus) => {
    setScoutingStatus(status);
    setDirty(true);
    setSaveStatus('dirty');
  }, []);

  const updateField = useCallback((key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaveStatus('dirty');
  }, []);

  const updateTags = useCallback((newTags: string[]) => {
    setTags(newTags);
    setTagsDirty(true);
    setDirty(true);
    setSaveStatus('dirty');
  }, []);

  // --- Save ---
  const save = useCallback(async () => {
    if (!selectedTeamNumber || !teamId || !eventKey || !canEdit) return;
    setSaveStatus('saving');
    try {
      const notePromise = fetch(
        `${API_BASE}/teams/${teamId}/event/${eventKey}/scouting/${selectedTeamNumber}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ notes, data, scoutingStatus }),
        },
      );

      const promises: Promise<Response>[] = [notePromise];

      if (tagsDirty) {
        promises.push(
          fetch(
            `${API_BASE}/teams/${teamId}/event/${eventKey}/picklist/team/${selectedTeamNumber}/tags`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ tags }),
            },
          ),
        );
      }

      const responses = await Promise.all(promises);
      if (responses.some((r) => !r.ok)) throw new Error('Save failed');

      // Update metadata from save response
      try {
        const saveJson = await responses[0].clone().json();
        const saved = saveJson?.data as ScoutingEntry | undefined;
        if (saved) {
          setNoteUpdatedAt(saved.updatedAt ?? null);
          setNoteUpdatedByName(saved.updatedByName ?? null);
        }
      } catch {
        // Non-critical — metadata will refresh on next load
      }

      setDirty(false);
      setTagsDirty(false);
      setLastSavedAt(new Date());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'clean' : s)), 2000);
      // Refresh summaries after save
      loadSummaries();
    } catch {
      setSaveStatus('error');
    }
  }, [
    selectedTeamNumber,
    teamId,
    eventKey,
    canEdit,
    notes,
    data,
    scoutingStatus,
    tags,
    tagsDirty,
    API_BASE,
    loadSummaries,
  ]);

  // --- SignalR ---
  const signalR = useSignalR(isOwnTeam);

  useEffect(() => {
    if (signalR.state !== 'connected') return;

    const handler = (...args: unknown[]) => {
      const msg = args[0] as {
        type?: string;
        eventKey?: string;
        targetTeamNumber?: number;
        userId?: string;
        updatedBy?: string;
      };
      if (msg?.type !== 'scouting-updated') return;
      if (msg.eventKey !== eventKey) return;
      if (user && msg.userId === user.id) return;

      if (msg.updatedBy) {
        setLastUpdatedBy(msg.updatedBy);
        setTimeout(() => setLastUpdatedBy(null), 5000);
      }

      // Refresh summaries
      loadSummaries();

      // Refresh individual note if viewing the updated team
      if (selectedTeamNumber && msg.targetTeamNumber === selectedTeamNumber && !dirty) {
        loadNote(selectedTeamNumber);
      }
    };

    signalR.on('scouting-updated', handler);

    // Also listen for picklist-updated — tags live in picklist but are
    // displayed alongside scouting data (e.g. team list badges).
    const picklistHandler = (...pArgs: unknown[]) => {
      const msg = pArgs[0] as { type?: string; eventKey?: string; userId?: string } | undefined;
      if (msg?.type !== 'picklist-updated') return;
      if (msg.eventKey && msg.eventKey !== eventKey) return;
      if (user && msg.userId === user.id) return;
      loadSummaries();
      // Refresh tags if viewing a team
      if (selectedTeamNumber && !tagsDirty) {
        loadTags(selectedTeamNumber);
      }
    };
    signalR.on('picklist-updated', picklistHandler);

    return () => {
      signalR.off('scouting-updated', handler);
      signalR.off('picklist-updated', picklistHandler);
    };
  }, [
    signalR,
    eventKey,
    user,
    selectedTeamNumber,
    dirty,
    tagsDirty,
    loadSummaries,
    loadNote,
    loadTags,
  ]);

  // --- Autosave ---
  const { autosaveEnabled, toggleAutosave } = useAutosave({
    saveFn: save,
    dirty,
    saving: saveStatus === 'saving',
    canEdit,
    debounceMs: 2000,
    storageKey: 'scouting',
  });

  // Summaries as a map for easy lookup
  const summaryMap = useMemo(() => {
    const map = new Map<number, ScoutingSummary>();
    for (const s of summaries) {
      map.set(s.targetTeamNumber, s);
    }
    return map;
  }, [summaries]);

  return {
    // Context
    eventKey,
    canEdit,
    user,
    activeTeam,
    teamId,
    // Summaries
    summaries,
    summaryMap,
    summariesLoading,
    loadSummaries,
    // Individual note
    notes,
    data,
    scoutingStatus,
    updateNotes,
    updateField,
    updateScoutingStatus,
    noteLoading,
    noteUpdatedAt,
    noteUpdatedByName,
    // Tags
    tags,
    allTags,
    updateTags,
    // Save
    dirty,
    saveStatus,
    lastSavedAt,
    save,
    // SignalR
    signalRState: signalR.state,
    lastUpdatedBy,
    // Past event import
    pastNote,
    pastNoteChecked,
    importPastNote,
    // Autosave
    autosaveEnabled,
    toggleAutosave,
  };
}
