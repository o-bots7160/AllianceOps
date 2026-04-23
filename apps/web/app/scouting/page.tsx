'use client';

import { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { InfoBox } from '@/components/info-box';
import { PageGuard } from '@/components/page-guard';
import { StatusBanner } from '@/components/status-banner';
import { SaveStatusBar } from '@/components/save-status-bar';
import { SaveComboButton } from '@/components/save-combo-button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useEventSetup } from '@/components/use-event-setup';
import { useAuth } from '@/components/use-auth';
import { useApi } from '@/components/use-api';
import { useScoutingData } from '@/hooks/use-scouting-data';
import { getAdapter, SCOUTING_STATUS_OPTIONS } from '@allianceops/shared';
import type {
  ScoutingFieldDefinition,
  GameMetricDefinition,
  ScoutingStatus,
  TeamRankAnalysis,
} from '@allianceops/shared';
import type { EnrichedTeam } from '@/lib/types';
import type { EnrichedTeam as PicklistEnrichedTeam } from '@/components/picklist/types';
import { ScoutingForm } from '@/components/scouting/scouting-form';
import { ScoutingTeamList } from '@/components/scouting/scouting-team-list';
import { TeamDetailModal } from '@/components/picklist/team-detail-modal';

interface TBAMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  time: number | null;
  winning_alliance: string;
}

function ScoutingContent() {
  const { eventKey, year } = useEventSetup();
  const { activeTeam } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const teamParam = searchParams.get('team');
  const selectedTeam = (() => {
    if (!teamParam) return null;
    const parsed = Number(teamParam);
    return Number.isFinite(parsed) ? parsed : null;
  })();

  const selectTeam = (teamNumber: number | null) => {
    if (teamNumber) {
      router.push(`/scouting/?team=${teamNumber}`);
    } else {
      router.push('/scouting/');
    }
  };

  const { data: teams, loading: teamsLoading } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const { data: matches } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );

  const {
    canEdit,
    user,
    summaryMap,
    notes,
    data,
    scoutingStatus,
    updateNotes,
    updateField,
    updatePerMatchValue,
    updateScoutingStatus,
    tags,
    allTags,
    updateTags,
    noteLoading,
    noteUpdatedAt,
    noteUpdatedByName,
    dirty,
    saveStatus,
    lastSavedAt,
    save,
    lastUpdatedBy,
    autosaveEnabled,
    toggleAutosave,
    pastNote,
    pastNoteChecked,
    importPastNote,
  } = useScoutingData(selectedTeam);

  // Adapter and metrics
  const { scoutingFields, cardMetrics } = useMemo(() => {
    try {
      const adapter = getAdapter(year);
      return {
        scoutingFields: adapter.scoutingFields ?? [],
        cardMetrics: (adapter.gameSpecificMetrics ?? []).filter(
          (m: GameMetricDefinition) =>
            m.renderLocation === 'team_card' || m.renderLocation === 'all',
        ),
      };
    } catch {
      return { scoutingFields: [] as ScoutingFieldDefinition[], cardMetrics: [] };
    }
  }, [year]);

  // EPA map for team card
  const epaMap = useMemo(() => {
    const map = new Map<number, EnrichedTeam>();
    if (!teams) return map;
    for (const t of teams) map.set(t.team_number, t);
    return map;
  }, [teams]);

  // EPA rank map
  const epaRankMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!teams) return map;
    const sorted = [...teams]
      .filter((t) => t.epa?.total != null)
      .sort((a, b) => (b.epa?.total ?? 0) - (a.epa?.total ?? 0));
    sorted.forEach((t, i) => map.set(t.team_number, i + 1));
    return map;
  }, [teams]);

  const selectedTeamData = selectedTeam ? epaMap.get(selectedTeam) : null;

  // Team records (wins/losses/ties) computed from qual matches — used for the team detail modal.
  const teamRecords = useMemo(() => {
    const records = new Map<number, { wins: number; losses: number; ties: number }>();
    if (!matches) return records;
    const qualMatches = matches.filter((m) => m.comp_level === 'qm');
    for (const m of qualMatches) {
      for (const teamKey of [...m.alliances.red.team_keys, ...m.alliances.blue.team_keys]) {
        const num = parseInt(teamKey.replace('frc', ''), 10);
        if (!records.has(num)) records.set(num, { wins: 0, losses: 0, ties: 0 });
        const rec = records.get(num)!;
        const isRed = m.alliances.red.team_keys.includes(teamKey);
        if (m.winning_alliance === 'red' && isRed) rec.wins++;
        else if (m.winning_alliance === 'blue' && !isRed) rec.wins++;
        else if (m.winning_alliance === '') rec.ties++;
        else if (m.alliances.red.score >= 0) rec.losses++;
      }
    }
    return records;
  }, [matches]);

  const emptyRankAnalysisMap = useMemo(() => new Map<string, TeamRankAnalysis>(), []);

  const [modalTeam, setModalTeam] = useState<number | null>(null);

  return (
    <PageGuard
      condition={eventKey}
      loading={teamsLoading}
      message="Select an event on the Event page first."
    >
      <div className="space-y-6">
        <InfoBox heading="Scouting">
          <p>
            <strong>Scouting</strong> lets you capture observations about teams at the current
            event. Click a team to open their analysis form where you can add notes and
            game-specific observations. Data is shared with your team in real-time. Use the Picklist
            to manage tags for team categorization.
          </p>
        </InfoBox>

        {!canEdit && activeTeam && (
          <StatusBanner variant="warning">
            <p className="text-sm">Read-only — you&apos;re not a team member.</p>
          </StatusBanner>
        )}

        {lastUpdatedBy && (
          <StatusBanner variant="info">
            <p className="text-sm">Updated by {lastUpdatedBy}</p>
          </StatusBanner>
        )}

        {selectedTeam === null ? (
          /* Team list view */
          <ScoutingTeamList teams={teams ?? []} summaryMap={summaryMap} onTeamSelect={selectTeam} />
        ) : (
          /* Individual team scouting view */
          <div className="space-y-4">
            {/* Back button + clickable team header + save */}
            <div className="flex items-center gap-4">
              <Link
                href="/scouting/"
                className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All Teams
              </Link>
              <button
                type="button"
                onClick={() => setModalTeam(selectedTeam)}
                aria-label={`View team ${selectedTeam} details`}
                className="group inline-flex items-center gap-2 text-left rounded-md px-1 -mx-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-lg font-bold">
                  {selectedTeam}
                  {selectedTeamData?.nickname && (
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                      {selectedTeamData.nickname}
                    </span>
                  )}
                </span>
                <svg
                  className="h-4 w-4 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7h6m0 0v6m0-6L10 16M7 7H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2"
                  />
                </svg>
              </button>
              <div className="ml-auto">
                <SaveComboButton
                  canEdit={canEdit}
                  hasUser={!!user}
                  hasTeam={!!activeTeam}
                  saving={saveStatus === 'saving'}
                  autosaveEnabled={autosaveEnabled}
                  onToggleAutosave={toggleAutosave}
                  onSave={save}
                  label="Save"
                />
              </div>
            </div>

            {noteLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-5">
                {/* Import from past event prompt */}
                {pastNoteChecked && pastNote && !dirty && !notes && (
                  <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <span className="font-medium">Notes from {pastNote.eventKey}</span>
                      {' — '}
                      import as a starting baseline?
                    </div>
                    <button
                      type="button"
                      onClick={importPastNote}
                      className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Import
                    </button>
                  </div>
                )}

                {/* Status + last-updated row (above Notes) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="scouting-status"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Status
                    </label>
                    <select
                      id="scouting-status"
                      value={scoutingStatus}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateScoutingStatus(e.target.value as ScoutingStatus)
                      }
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm disabled:opacity-50"
                    >
                      {SCOUTING_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {noteUpdatedAt && (
                    <div className="sm:ml-auto text-xs text-gray-500 dark:text-gray-400">
                      Last updated {new Date(noteUpdatedAt).toLocaleString()}
                      {noteUpdatedByName && <span> by {noteUpdatedByName}</span>}
                    </div>
                  )}
                </div>

                <ScoutingForm
                  fields={scoutingFields}
                  notes={notes}
                  data={data}
                  disabled={!canEdit}
                  onNotesChange={updateNotes}
                  onFieldChange={updateField}
                  onPerMatchChange={updatePerMatchValue}
                  matches={matches ?? []}
                  targetTeamNumber={selectedTeam}
                  tags={tags}
                  allTags={allTags}
                  onTagsChange={updateTags}
                />
              </div>
            )}
          </div>
        )}

        {modalTeam !== null && (
          <TeamDetailModal
            teamNumber={modalTeam}
            epaMap={epaMap as Map<number, PicklistEnrichedTeam>}
            epaRankMap={epaRankMap}
            rankAnalysisMap={emptyRankAnalysisMap}
            teamRecords={teamRecords}
            cardMetrics={cardMetrics}
            onClose={() => setModalTeam(null)}
          />
        )}

        <SaveStatusBar status={saveStatus} lastSavedAt={lastSavedAt} />
      </div>
    </PageGuard>
  );
}

export default function ScoutingPage() {
  return (
    <Suspense>
      <ScoutingContent />
    </Suspense>
  );
}
