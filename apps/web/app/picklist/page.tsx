'use client';

import { useState } from 'react';
import { InfoBox } from '@/components/info-box';
import { PageGuard } from '@/components/page-guard';
import { StatusBanner } from '@/components/status-banner';
import { SaveStatusBar } from '@/components/save-status-bar';
import { SaveComboButton } from '@/components/save-combo-button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { usePicklistData } from '@/hooks/use-picklist-data';
import { useScoutingSummaries } from '@/hooks/use-scouting-summaries';
import { useEventSetup } from '@/components/use-event-setup';
import { TagFilterControl } from '@/components/picklist/tag-filter-control';
import { PicklistTable } from '@/components/picklist/picklist-table';
import { TeamDetailModal } from '@/components/picklist/team-detail-modal';
import { RANK_BY_OPTIONS, type RankByOption } from '@/components/picklist/types';

export default function PicklistPage() {
  const { eventKey: setupEventKey } = useEventSetup();

  // Scouting summaries for TeamCard in modal
  const { summaryMap: scoutingSummaryMap } = useScoutingSummaries(setupEventKey);

  const {
    eventKey,
    teamNumber,
    canEdit,
    user,
    activeTeam,
    teamsLoading,
    filtered,
    updateEntries,
    saving,
    saved,
    dirty,
    lastUpdated,
    loadError,
    handleSave,
    sortState,
    setSortState,
    onSort,
    search,
    setSearch,
    tagFilters,
    setTagFilters,
    hideExcluded,
    setHideExcluded,
    allTags,
    rerank,
    discardConfirm,
    onDiscardConfirm,
    onDiscardCancel,
    epaMap,
    epaRankMap,
    rankAnalysisMap,
    teamRecords,
    cardMetrics,
    scoutingFields,
    lastUpdatedBy,
    autosaveEnabled,
    toggleAutosave,
  } = usePicklistData();

  const [modalTeam, setModalTeam] = useState<number | null>(null);
  const [rerankConfirm, setRerankConfirm] = useState<{
    value: RankByOption;
    label: string;
  } | null>(null);
  useUnsavedGuard(dirty);

  const saveStatus = saving ? 'saving' : saved ? 'saved' : dirty ? 'dirty' : 'clean';

  return (
    <PageGuard
      condition={eventKey}
      loading={teamsLoading}
      message="Select an event on the Event page first."
    >
      <div className="space-y-6">
        <InfoBox heading="Picklist">
          <p>
            <strong>Picklist</strong> ranks all teams at the event by a composite score based on
            Statbotics EPA ratings — auto, teleop, and endgame — with Blue Alliance event ranking
            included for side-by-side comparison. Use this during alliance selection to identify the
            strongest available partners.
          </p>
          <p>
            <strong>Tags</strong> let you categorize teams (e.g., &quot;strong auto&quot;,
            &quot;good defense&quot;). <strong>Exclude</strong> teams you don&apos;t want to
            consider. Use the <strong>Scouting</strong> page for detailed notes on each team.
            Changes are shared with your team when you save.
          </p>
          <p>
            Search by team number or name, and filter by tag. Click any table header to sort by that
            column. The picklist auto-refreshes every 30 seconds to pick up changes from teammates.
          </p>
        </InfoBox>

        {!canEdit && teamNumber && activeTeam && (
          <StatusBanner variant="warning">
            <p className="text-sm">
              Viewing team {teamNumber} — read-only (you&apos;re not a member)
            </p>
          </StatusBanner>
        )}

        {loadError && (
          <StatusBanner variant="error">
            <p className="text-sm">{loadError}</p>
          </StatusBanner>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search team # or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[12rem] flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
          <TagFilterControl allTags={allTags} selected={tagFilters} onChange={setTagFilters} />
          <label className="flex items-center gap-2 px-2 py-1 rounded-md text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800">
            <input
              type="checkbox"
              checked={hideExcluded}
              onChange={(e) => setHideExcluded(e.target.checked)}
              className="h-5 w-5 cursor-pointer accent-primary-600"
            />
            Hide excluded
          </label>
          <div className="flex items-center gap-3 lg:ml-auto shrink-0">
            {canEdit && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const value = e.target.value as RankByOption;
                  if (!value) return;
                  const label =
                    RANK_BY_OPTIONS.find((o) => o.value === value)?.label ?? value;
                  setRerankConfirm({ value, label });
                  e.target.value = '';
                }}
                className="h-[38px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="">Rank by…</option>
                {RANK_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            <SaveComboButton
              canEdit={canEdit}
              hasUser={!!user}
              hasTeam={!!activeTeam}
              saving={saving}
              autosaveEnabled={autosaveEnabled}
              onToggleAutosave={toggleAutosave}
              onSave={handleSave}
              label="Save Picklist"
            />
          </div>
        </div>

        <PicklistTable
          entries={filtered}
          sortState={sortState}
          onSort={onSort}
          canEdit={canEdit}
          teamNumber={teamNumber}
          allTags={allTags}
          rankAnalysisMap={rankAnalysisMap}
          scoutingSummaryMap={scoutingSummaryMap}
          updateEntries={updateEntries}
          setSortState={setSortState}
          onTeamClick={setModalTeam}
        />

        {modalTeam !== null && (
          <TeamDetailModal
            teamNumber={modalTeam}
            epaMap={epaMap}
            epaRankMap={epaRankMap}
            rankAnalysisMap={rankAnalysisMap}
            teamRecords={teamRecords}
            cardMetrics={cardMetrics}
            scoutingSummary={scoutingSummaryMap.get(modalTeam) ?? null}
            scoutingFields={scoutingFields}
            onClose={() => setModalTeam(null)}
          />
        )}
      </div>

      {lastUpdatedBy && (
        <div className="fixed bottom-14 right-4 z-20 rounded-lg bg-blue-100 dark:bg-blue-900 px-4 py-2 text-sm text-blue-800 dark:text-blue-200 shadow-lg animate-fade-in">
          Updated by {lastUpdatedBy}
        </div>
      )}

      <SaveStatusBar
        status={saveStatus}
        lastSavedAt={lastUpdated ? new Date(lastUpdated) : undefined}
      />

      {rerankConfirm && (
        <ConfirmDialog
          open
          title="Overwrite Rankings"
          message={`Overwrite manual ranks with ${rerankConfirm.label}?`}
          confirmLabel="Overwrite"
          variant="danger"
          onConfirm={() => {
            rerank(rerankConfirm.value);
            setRerankConfirm(null);
          }}
          onCancel={() => setRerankConfirm(null)}
        />
      )}

      {discardConfirm && (
        <ConfirmDialog
          open
          title="Unsaved Changes"
          message="You have unsaved changes. Discard them?"
          confirmLabel="Discard"
          variant="danger"
          onConfirm={onDiscardConfirm}
          onCancel={onDiscardCancel}
        />
      )}
    </PageGuard>
  );
}
