'use client';

import type { DutySlotDefinition } from '@allianceops/shared';

const CATEGORY_COLORS: Record<string, string> = {
  auto: 'border-l-green-500',
  teleop: 'border-l-blue-500',
  endgame: 'border-l-purple-500',
  defense: 'border-l-orange-500',
  discipline: 'border-l-red-500',
};

export interface DutySlotEditorProps {
  slot: DutySlotDefinition;
  assignment: number | null;
  note: string;
  teamNumbers: number[];
  canEdit: boolean;
  onAssignmentChange: (teamNumber: number | null) => void;
  onNoteChange: (note: string) => void;
}

export function DutySlotEditor({
  slot,
  assignment,
  note,
  teamNumbers,
  canEdit,
  onAssignmentChange,
  onNoteChange,
}: DutySlotEditorProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${CATEGORY_COLORS[slot.category] || ''} p-3 space-y-2`}
    >
      <div className="font-medium text-sm" title={slot.description}>
        {slot.label}
      </div>
      <select
        value={assignment ?? ''}
        onChange={(e) =>
          onAssignmentChange(e.target.value ? parseInt(e.target.value, 10) : null)
        }
        disabled={!canEdit}
        className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Unassigned</option>
        {teamNumbers.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <textarea
        rows={3}
        placeholder="Notes..."
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        disabled={!canEdit}
        className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs resize-y disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}
