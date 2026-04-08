'use client';

export interface PeriodOption {
  label: string;
  days: number;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { label: '2W', days: 14 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

interface PeriodSelectorProps {
  selectedDays: number;
  onChange: (days: number) => void;
  disabled?: boolean;
}

export function PeriodSelector({ selectedDays, onChange, disabled }: PeriodSelectorProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5" role="radiogroup" aria-label="Time period">
      {PERIOD_OPTIONS.map(({ label, days }) => {
        const isActive = selectedDays === days;
        return (
          <button
            key={days}
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(days)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
