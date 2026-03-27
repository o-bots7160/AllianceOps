'use client';

import { useState, useCallback, useMemo } from 'react';
import { useEventSetup } from '../../components/use-event-setup';
import { useApi } from '../../components/use-api';
import { useSimulation } from '../../components/simulation-context';
import { useAuth } from '../../components/use-auth';
import { filterMatchesByCursor, getTeamRecord } from '../../lib/simulation-filters';
import { sortMatches } from '../../lib/match-utils';
import { useSimulationEpa } from '../../hooks/use-simulation-epa';
import { InfoBox } from '../../components/info-box';
import { PageGuard } from '../../components/page-guard';
import { StatusBanner } from '../../components/status-banner';
import { SaveStatusBar } from '../../components/save-status-bar';
import { TeamCard, type SectionExpandState } from '../../components/team-card';
import { MatchSelector } from '../../components/planner/match-selector';
import { DutySlotEditor } from '../../components/planner/duty-slot-editor';
import { useMatchPlan } from '../../hooks/use-match-plan';
import { useUnsavedGuard } from '../../hooks/use-unsaved-guard';
import type { EnrichedTeam } from '../../lib/types';
import { getAdapter, analyzeAllRankDiscrepancies } from '@allianceops/shared';

interface TBAMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  winning_alliance: string;
}

export default function PlannerPage() {
  const { eventKey, teamNumber, year } = useEventSetup();
  const { activeCursor } = useSimulation();
  const { user, activeTeam } = useAuth();
  const isOwnTeam = activeTeam !== null && activeTeam.teamNumber === teamNumber;
  const canEdit = isOwnTeam;
  const myTeamKey = `frc${teamNumber}`;

  let adapter: ReturnType<typeof getAdapter> | null = null;
  try {
    adapter = getAdapter(year);
  } catch {
    // No adapter registered for this year
  }

  const dutySlots = adapter?.dutySlots ?? [];
  const dutyTemplates = adapter?.dutyTemplates ?? [];
  const cardMetrics = (adapter?.gameSpecificMetrics ?? []).filter(
    (m) => m.renderLocation === 'team_card' || m.renderLocation === 'all',
  );

  const { data: rawMatches, loading: matchesLoading } = useApi<TBAMatch[]>(
    eventKey ? `event/${eventKey}/matches` : null,
  );
  const { data: teams, loading: teamsLoading } = useApi<EnrichedTeam[]>(
    eventKey ? `event/${eventKey}/teams` : null,
  );

  const matches = rawMatches ? filterMatchesByCursor(rawMatches, activeCursor) : rawMatches;

  const [selectedMatch, setSelectedMatch] = useState<string>('');

  const allSortedMatches = useMemo(
    () => (matches ? sortMatches(matches) : undefined),
    [matches],
  );

  const myMatches = useMemo(
    () =>
      allSortedMatches?.filter(
        (m) =>
          m.alliances.red.team_keys.includes(myTeamKey) ||
          m.alliances.blue.team_keys.includes(myTeamKey),
      ),
    [allSortedMatches, myTeamKey],
  );

  const nextUnplayed = myMatches?.find((m) => m.alliances.red.score < 0);
  const defaultMatch = nextUnplayed ?? myMatches?.[myMatches.length - 1];
  const currentMatch = myMatches?.find((m) => m.key === selectedMatch) ?? defaultMatch;

  const matchTeamNumbers = useMemo(() => {
    if (!currentMatch) return [];
    return [
      ...currentMatch.alliances.red.team_keys,
      ...currentMatch.alliances.blue.team_keys,
    ].map((k) => parseInt(k.replace('frc', ''), 10));
  }, [currentMatch]);

  const epaMap = useSimulationEpa(teams, eventKey, year, activeCursor, matchTeamNumbers);

  const epaRankMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!teams) return map;
    const sorted = [...teams]
      .filter((t) => t.epa?.total != null)
      .sort((a, b) => (b.epa?.total ?? 0) - (a.epa?.total ?? 0));
    sorted.forEach((t, i) => map.set(t.team_number, i + 1));
    return map;
  }, [teams]);

  const rankAnalysisMap = useMemo(() => {
    if (!teams || !matches)
      return new Map<
        string,
        ReturnType<typeof analyzeAllRankDiscrepancies> extends Map<string, infer V>
        ? V
        : never
      >();
    const teamInputs = teams
      .filter((t) => t.tbaRank != null && epaRankMap.has(t.team_number))
      .map((t) => ({
        teamKey: `frc${t.team_number}`,
        tbaRank: t.tbaRank!,
        epaRank: epaRankMap.get(t.team_number)!,
      }));
    const qualMatches = matches.filter((m) => m.comp_level === 'qm');
    const matchInputs = qualMatches.map((m) => ({
      key: m.key,
      matchNumber: m.match_number,
      redTeams: m.alliances.red.team_keys,
      blueTeams: m.alliances.blue.team_keys,
      redScore: m.alliances.red.score,
      blueScore: m.alliances.blue.score,
      winningAlliance: m.winning_alliance,
    }));
    const epaRecord: Record<string, { total: number }> = {};
    for (const t of teams) {
      if (t.epa) epaRecord[`frc${t.team_number}`] = t.epa;
    }
    return analyzeAllRankDiscrepancies(teamInputs, matchInputs, epaRecord);
  }, [teams, matches, epaRankMap]);

  const isRed = currentMatch?.alliances.red.team_keys.includes(myTeamKey);
  const allianceTeams = currentMatch
    ? isRed
      ? currentMatch.alliances.red.team_keys
      : currentMatch.alliances.blue.team_keys
    : [];
  const teamNumbers = allianceTeams.map((t) => parseInt(t.replace('frc', ''), 10));

  const plan = useMatchPlan({
    matchKey: currentMatch?.key,
    teamId: activeTeam?.teamId,
    eventKey: eventKey ?? '',
    userId: user?.id,
    isOwnTeam,
    canEdit,
    teamNumbers,
    epaMap,
    dutySlots,
    dutyTemplates,
  });

  const [sectionState, setSectionState] = useState<SectionExpandState>({
    rank: true,
    epa: true,
    game: true,
  });
  const handleSectionToggle = useCallback((section: keyof SectionExpandState) => {
    setSectionState((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const { confirmIfDirty } = useUnsavedGuard(plan.dirty);

  const handleMatchChange = useCallback(
    (key: string) => {
      confirmIfDirty(() => {
        setSelectedMatch(key);
        plan.resetPlan();
      });
    },
    [confirmIfDirty, plan.resetPlan],
  );

  return (
    <PageGuard
      condition={eventKey}
      loading={matchesLoading || teamsLoading}
      message="Select an event on the Event page first."
    >
      <div className="space-y-6">
        <InfoBox
          heading={`Duty Planner${adapter ? ` — ${adapter.gameName} ${adapter.year}` : ''}`}
          headingExtra={
            <div className="flex items-center gap-3">
              {currentMatch && (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${isRed
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}
                >
                  {isRed ? 'Red' : 'Blue'} Alliance
                </span>
              )}
            </div>
          }
        >
          <p>
            <strong>Duty Planner</strong> lets you assign specific roles to each alliance partner
            for an upcoming match. Select a match, then assign teams to their duties.
          </p>
          <p>
            Use <strong>Templates</strong> to quickly apply a pre-built strategy. Templates
            auto-assign teams to roles based on their EPA data. You can customize assignments after
            applying a template.
          </p>
          <p>
            Add <strong>notes</strong> to any duty slot for match-specific instructions. Click{' '}
            <strong>Save Plan</strong> to store the plan. Duty categories are color-coded: green
            (auto), blue (teleop), purple (endgame), orange (defense), red (discipline).
          </p>
        </InfoBox>

        {!canEdit && teamNumber && activeTeam && (
          <StatusBanner variant="warning">
            Viewing team {teamNumber} — read-only (you&apos;re not a member)
          </StatusBanner>
        )}

        {!adapter && (
          <StatusBanner variant="warning">
            No game adapter registered for {year}. Duty slots and templates are unavailable.
          </StatusBanner>
        )}

        <MatchSelector
          myMatches={myMatches ?? []}
          currentMatchKey={currentMatch?.key}
          selectedMatch={selectedMatch}
          onMatchChange={handleMatchChange}
          template={plan.template}
          onTemplateChange={plan.applyTemplate}
          dutyTemplates={dutyTemplates}
          canEdit={canEdit}
          saveStatus={plan.saveStatus}
          user={user}
          activeTeam={activeTeam}
          onSave={plan.save}
          autosaveEnabled={plan.autosaveEnabled}
          onToggleAutosave={plan.toggleAutosave}
        />

        {plan.lastUpdatedBy && (
          <StatusBanner variant="info">
            Plan updated by {plan.lastUpdatedBy}
          </StatusBanner>
        )}

        {plan.remoteUpdateAvailable && (
          <StatusBanner variant="warning">
            <span>A teammate updated this plan.</span>{' '}
            <button
              onClick={plan.applyRemoteUpdate}
              className="underline font-medium hover:text-blue-600"
            >
              Reload latest
            </button>
          </StatusBanner>
        )}

        {activeCursor !== null && (
          <StatusBanner variant="warning">
            📊 Simulation active — EPA values reflect pre-event estimates. W-L records filtered to
            match {activeCursor}.
          </StatusBanner>
        )}

        {currentMatch && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Team Strengths
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {allianceTeams.map((t) => (
                  <TeamCard
                    key={t}
                    teamKey={t}
                    epaMap={epaMap}
                    metrics={cardMetrics}
                    epaRank={epaRankMap.get(parseInt(t.replace('frc', ''), 10))}
                    defaultExpanded
                    record={
                      activeCursor !== null && matches
                        ? getTeamRecord(matches, t, activeCursor)
                        : undefined
                    }
                    rankAnalysis={rankAnalysisMap.get(t)}
                    sectionState={sectionState}
                    onSectionToggle={handleSectionToggle}
                  />
                ))}
              </div>
            </div>

            {dutySlots.length > 0 && (
              <div className="relative">
                {!canEdit && !activeTeam && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-lg">
                    <div className="text-center px-6 py-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg max-w-sm">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {!user
                          ? 'Log In to Create or Join a Team to Plan Matches'
                          : 'Join a Team to Plan Matches'}
                      </p>
                      <a
                        href={!user ? '/' : '/team/'}
                        className="mt-3 inline-block text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        {!user ? 'Log In' : 'Go to Team Page'} &rarr;
                      </a>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dutySlots.map((slot) => (
                    <DutySlotEditor
                      key={slot.key}
                      slot={slot}
                      assignment={plan.assignments[slot.key] ?? null}
                      note={plan.notes[slot.key] || ''}
                      teamNumbers={teamNumbers}
                      canEdit={canEdit}
                      onAssignmentChange={(v) => plan.setAssignment(slot.key, v)}
                      onNoteChange={(v) => plan.setNote(slot.key, v)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <SaveStatusBar
          status={plan.saveStatus}
          errorMessage={plan.saveError}
          lastSavedAt={plan.lastSavedAt}
        />
      </div>
    </PageGuard>
  );
}
