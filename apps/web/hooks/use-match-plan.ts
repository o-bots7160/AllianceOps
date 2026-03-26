import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiBase } from '../lib/api-base';
import { useSignalR } from './use-signalr';
import { useAutosave } from './use-autosave';
import type { EnrichedTeam } from '../lib/types';
import type { DutySlotDefinition, DutyTemplate, DutyTemplateSlot } from '@allianceops/shared';

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export interface UseMatchPlanOptions {
  matchKey: string | undefined;
  teamId: string | undefined;
  eventKey: string;
  userId: string | undefined;
  isOwnTeam: boolean;
  canEdit: boolean;
  teamNumbers: number[];
  epaMap: Map<number, EnrichedTeam>;
  dutySlots: DutySlotDefinition[];
  dutyTemplates: DutyTemplate[];
}

export interface UseMatchPlanReturn {
  assignments: Record<string, number | null>;
  notes: Record<string, string>;
  template: string;
  dirty: boolean;
  planLoading: boolean;
  saveStatus: SaveStatus;
  saveError: string | undefined;
  lastSavedAt: Date | undefined;
  setAssignment: (slotKey: string, teamNumber: number | null) => void;
  setNote: (slotKey: string, note: string) => void;
  applyTemplate: (name: string) => void;
  save: () => Promise<void>;
  resetPlan: () => void;
  signalRState: string;
  lastUpdatedBy: string | null;
  autosaveEnabled: boolean;
  toggleAutosave: () => void;
  remoteUpdateAvailable: boolean;
  applyRemoteUpdate: () => void;
}

/** Sum EPA breakdown values for the given keys. */
function sumEpaKeys(teamNum: number, epaMap: Map<number, EnrichedTeam>, keys: string[]): number {
  const bd = epaMap.get(teamNum)?.epa?.breakdown;
  if (!bd) return 0;
  return keys.reduce((sum, k) => sum + (bd[k] ?? 0), 0);
}

/** Normalize a template assignment value to a full DutyTemplateSlot. */
function toSlotConfig(val: string | DutyTemplateSlot | undefined): DutyTemplateSlot {
  if (!val) return { hint: '' };
  if (typeof val === 'string') return { hint: val };
  return val;
}

/** Build smart assignments from EPA data using adapter-defined duty slots. */
function buildTemplateAssignments(
  _templateName: string,
  teamNums: number[],
  epaMap: Map<number, EnrichedTeam>,
  dutySlots: DutySlotDefinition[],
  templateHints: Record<string, string | DutyTemplateSlot>,
): { assignments: Record<string, number | null>; notes: Record<string, string> } {
  if (teamNums.length === 0) return { assignments: {}, notes: {} };

  const byTotal = [...teamNums].sort(
    (a, b) => (epaMap.get(b)?.epa?.total ?? 0) - (epaMap.get(a)?.epa?.total ?? 0),
  );
  const weakest = byTotal[byTotal.length - 1];

  const a: Record<string, number | null> = {};
  const n: Record<string, string> = {};

  const slotAssignIndex = new Map<string, number>();

  for (const slot of dutySlots) {
    const cfg = toSlotConfig(templateHints[slot.key]);
    n[slot.key] = cfg.hint;
    const strategy = cfg.strategy ?? 'strongest';

    if (strategy === 'skip' || strategy === 'all') {
      a[slot.key] = null;
      continue;
    }

    if (strategy === 'weakest') {
      a[slot.key] = weakest;
      continue;
    }

    if (strategy === 'endgame_smart') {
      const towerKeys = cfg.epaRankKeysOverride ?? slot.epaRankKeys ?? ['total_tower'];
      const scoringKeys = cfg.scoringKeysOverride ?? ['teleop_fuel', 'total_fuel'];
      const LOW_EPA_THRESHOLD = 5;

      const sig = '_endgame_smart';
      const idx = slotAssignIndex.get(sig) ?? 0;
      const ranked = [...teamNums].sort(
        (x, y) => (epaMap.get(y)?.epa?.total ?? 0) - (epaMap.get(x)?.epa?.total ?? 0),
      );
      const team = ranked[idx % ranked.length];
      slotAssignIndex.set(sig, idx + 1);

      const scoringEpa = sumEpaKeys(team, epaMap, scoringKeys);
      const towerEpa = sumEpaKeys(team, epaMap, towerKeys);

      if (scoringEpa > towerEpa) {
        a[slot.key] = team;
        n[slot.key] =
          `Continue scoring — fuel/teleop EPA (${scoringEpa.toFixed(1)}) exceeds tower EPA (${towerEpa.toFixed(1)}). Skip tower climb`;
      } else if (towerEpa >= scoringEpa && towerEpa > LOW_EPA_THRESHOLD) {
        a[slot.key] = team;
        n[slot.key] =
          `Climb tower — tower EPA (${towerEpa.toFixed(1)}) is competitive. Target highest achievable level`;
      } else {
        a[slot.key] = null;
        n[slot.key] =
          `Low scoring (${scoringEpa.toFixed(1)}) and tower (${towerEpa.toFixed(1)}) EPA — suggest defense`;
      }
      continue;
    }

    if (slot.category === 'defense' && !cfg.strategy) {
      a[slot.key] = null;
      continue;
    }
    if (slot.category === 'discipline' && !cfg.strategy) {
      a[slot.key] = null;
      continue;
    }

    const keys = cfg.epaRankKeysOverride ?? slot.epaRankKeys;
    if (keys && keys.length > 0) {
      const ranked = [...teamNums].sort(
        (x, y) => sumEpaKeys(y, epaMap, keys) - sumEpaKeys(x, epaMap, keys),
      );
      const sig = keys.join(',');
      const idx = slotAssignIndex.get(sig) ?? 0;
      a[slot.key] = ranked[idx % ranked.length];
      slotAssignIndex.set(sig, idx + 1);
    } else {
      const catKey =
        slot.category === 'auto' ? 'auto' : slot.category === 'endgame' ? 'endgame' : 'teleop';
      const ranked = [...teamNums].sort(
        (x, y) => (epaMap.get(y)?.epa?.[catKey] ?? 0) - (epaMap.get(x)?.epa?.[catKey] ?? 0),
      );
      const sig = `_cat_${catKey}`;
      const idx = slotAssignIndex.get(sig) ?? 0;
      a[slot.key] = ranked[idx % ranked.length];
      slotAssignIndex.set(sig, idx + 1);
    }
  }

  return { assignments: a, notes: n };
}

export function useMatchPlan({
  matchKey,
  teamId,
  eventKey,
  userId,
  isOwnTeam,
  canEdit,
  teamNumbers,
  epaMap,
  dutySlots,
  dutyTemplates,
}: UseMatchPlanOptions): UseMatchPlanReturn {
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<string>('');
  const [dirty, setDirty] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean');
  const [saveError, setSaveError] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();

  // Stabilize teamNumbers identity to avoid re-triggering the template callback
  const teamNumsKey = teamNumbers.join(',');
  const teamNumsRef = useRef(teamNumbers);
  teamNumsRef.current = teamNumbers;

  // Load saved plan when match or team changes
  useEffect(() => {
    if (!matchKey || !teamId || !eventKey || !isOwnTeam) return;
    let cancelled = false;
    setPlanLoading(true);
    const API_BASE = getApiBase();
    fetch(`${API_BASE}/teams/${teamId}/event/${eventKey}/match/${matchKey}/plan`, {
      credentials: 'same-origin',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) {
          setPlanLoading(false);
          return;
        }
        const plan = json.data;
        if (plan.duties && plan.duties.length > 0) {
          const loadedAssignments: Record<string, number | null> = {};
          const loadedNotes: Record<string, string> = {};
          for (const d of plan.duties) {
            loadedAssignments[d.slotKey] = d.teamNumber;
            loadedNotes[d.slotKey] = d.notes ?? '';
          }
          setAssignments(loadedAssignments);
          setNotes(loadedNotes);
          setTemplate('');
          setDirty(false);
          setSaveStatus('clean');
          setLastSavedAt(plan.updatedAt ? new Date(plan.updatedAt) : undefined);
        }
        setPlanLoading(false);
      })
      .catch(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchKey, teamId, eventKey, isOwnTeam]);

  const setAssignment = useCallback((slotKey: string, teamNumber: number | null) => {
    setAssignments((prev) => ({ ...prev, [slotKey]: teamNumber }));
    setDirty(true);
    setSaveStatus('dirty');
  }, []);

  const setNote = useCallback((slotKey: string, note: string) => {
    setNotes((prev) => ({ ...prev, [slotKey]: note }));
    setDirty(true);
    setSaveStatus('dirty');
  }, []);

  const applyTemplate = useCallback(
    (name: string) => {
      setTemplate(name);
      if (!name) {
        setAssignments({});
        setNotes({});
        return;
      }
      const tmpl = dutyTemplates.find((t) => t.name === name);
      const result = buildTemplateAssignments(
        name,
        teamNumsRef.current,
        epaMap,
        dutySlots,
        tmpl?.assignments ?? {},
      );
      setAssignments(result.assignments);
      setNotes(result.notes);
      setDirty(true);
      setSaveStatus('dirty');
    },
    [teamNumsKey, epaMap, dutySlots, dutyTemplates],
  );

  const save = useCallback(async () => {
    if (!matchKey || !canEdit || !teamId) return;
    const duties = Object.entries(assignments)
      .filter(([, v]) => v !== null)
      .map(([slotKey, teamNumber]) => ({
        slotKey,
        teamNumber: teamNumber!,
        notes: notes[slotKey] || undefined,
      }));

    setSaveStatus('saving');
    setSaveError(undefined);
    try {
      const API_BASE = getApiBase();
      const res = await fetch(
        `${API_BASE}/teams/${teamId}/event/${eventKey}/match/${matchKey}/plan`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duties }),
        },
      );
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setDirty(false);
      setLastSavedAt(new Date());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'clean' : s)), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      setSaveStatus('error');
    }
  }, [matchKey, canEdit, teamId, eventKey, assignments, notes]);

  const resetPlan = useCallback(() => {
    setAssignments({});
    setNotes({});
    setTemplate('');
    setDirty(false);
    setSaveStatus('clean');
    setSaveError(undefined);
  }, []);

  // --- SignalR: listen for teammate match plan updates ---
  const signalR = useSignalR(isOwnTeam);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [remoteUpdateAvailable, setRemoteUpdateAvailable] = useState(false);

  const reloadPlan = useCallback(() => {
    if (!matchKey || !teamId || !eventKey || !isOwnTeam) return;
    const API_BASE = getApiBase();
    fetch(`${API_BASE}/teams/${teamId}/event/${eventKey}/match/${matchKey}/plan`, {
      credentials: 'same-origin',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.data) return;
        const plan = json.data;
        if (plan.duties && plan.duties.length > 0) {
          const loadedAssignments: Record<string, number | null> = {};
          const loadedNotes: Record<string, string> = {};
          for (const d of plan.duties) {
            loadedAssignments[d.slotKey] = d.teamNumber;
            loadedNotes[d.slotKey] = d.notes ?? '';
          }
          setAssignments(loadedAssignments);
          setNotes(loadedNotes);
          setDirty(false);
          setSaveStatus('clean');
          setLastSavedAt(plan.updatedAt ? new Date(plan.updatedAt) : undefined);
        }
        setRemoteUpdateAvailable(false);
      })
      .catch(() => {});
  }, [matchKey, teamId, eventKey, isOwnTeam]);

  useEffect(() => {
    if (signalR.state !== 'connected') return;

    const handler = (...args: unknown[]) => {
      const msg = args[0] as
        | {
            type?: string;
            matchKey?: string;
            userId?: string;
            updatedBy?: string;
          }
        | undefined;
      if (msg?.type !== 'matchplan-updated') return;
      if (msg.matchKey !== matchKey) return;
      if (userId && msg.userId === userId) return; // Ignore own save echo

      if (msg.updatedBy) {
        setLastUpdatedBy(msg.updatedBy);
        setTimeout(() => setLastUpdatedBy(null), 5000);
      }

      // Auto-reload if no unsaved changes; otherwise notify user
      if (!dirty) {
        reloadPlan();
      } else {
        setRemoteUpdateAvailable(true);
      }
    };

    signalR.on('matchplan-updated', handler);
    return () => signalR.off('matchplan-updated', handler);
  }, [signalR, dirty, matchKey, userId, reloadPlan]);

  const applyRemoteUpdate = useCallback(() => {
    reloadPlan();
  }, [reloadPlan]);

  // --- Autosave ---
  const { autosaveEnabled, toggleAutosave } = useAutosave({
    saveFn: save,
    dirty,
    saving: saveStatus === 'saving',
    canEdit,
    debounceMs: 3000,
    storageKey: 'planner',
  });

  return {
    assignments,
    notes,
    template,
    dirty,
    planLoading,
    saveStatus,
    saveError,
    lastSavedAt,
    setAssignment,
    setNote,
    applyTemplate,
    save,
    resetPlan,
    signalRState: signalR.state,
    lastUpdatedBy,
    autosaveEnabled,
    toggleAutosave,
    remoteUpdateAvailable,
    applyRemoteUpdate,
  };
}
