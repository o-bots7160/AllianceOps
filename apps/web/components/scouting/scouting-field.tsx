'use client';

import type { ScoutingFieldDefinition } from '@allianceops/shared';

function FieldDescription({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{text}</p>;
}

export function ScoutingField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ScoutingFieldDefinition;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case 'number': {
      const isReadOnly = field.readOnly === true;
      const displayValue = typeof value === 'number' ? value : '';
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
          </label>
          <FieldDescription text={field.description} />
          <input
            type="number"
            value={displayValue}
            disabled={disabled || isReadOnly}
            readOnly={isReadOnly}
            onChange={(e) => {
              if (isReadOnly) return;
              onChange(e.target.value === '' ? null : Number(e.target.value));
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm disabled:opacity-50 read-only:bg-gray-100 dark:read-only:bg-gray-900 read-only:cursor-not-allowed"
          />
          {isReadOnly && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
              Automatically averaged from per-match entries
            </p>
          )}
        </div>
      );
    }

    case 'boolean':
      return (
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={value === true}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 accent-primary-600"
            />
            {field.label}
          </label>
          {field.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-6">
              {field.description}
            </p>
          )}
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
          </label>
          <FieldDescription text={field.description} />
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((option) => (
              <label
                key={option}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm cursor-pointer select-none transition-colors ${value === option
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name={field.key}
                  value={option}
                  checked={value === option}
                  disabled={disabled}
                  onChange={() => onChange(option)}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      );

    case 'multi-select': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (option: string) => {
        if (selected.includes(option)) {
          onChange(selected.filter((s) => s !== option));
        } else {
          onChange([...selected, option]);
        }
      };
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
          </label>
          <FieldDescription text={field.description} />
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((option) => (
              <label
                key={option}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm cursor-pointer select-none transition-colors ${selected.includes(option)
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  disabled={disabled}
                  onChange={() => toggle(option)}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      );
    }

    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
          </label>
          <FieldDescription text={field.description} />
          <textarea
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.description}
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm disabled:opacity-50 resize-y"
          />
        </div>
      );

    default:
      return null;
  }
}
