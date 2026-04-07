// 📌 Proactive: Tests written from PRD spec while implementation was in progress. May need adjustment.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  BPCategory,
  BloodPressureMetric,
  MetricType,
} from '@/lib/types/metrics';

// NOTE: Update import path once Elliot creates the component
// import { LatestReading } from '@/components/LatestReading';

// ─── Stub component until Elliot delivers ────────────────────────────
// Remove this stub and uncomment the real import once the component exists.
interface LatestReadingProps {
  reading: BloodPressureMetric | null;
}

function LatestReading({ reading }: LatestReadingProps) {
  if (!reading) {
    return (
      <div data-testid="empty-state">
        No readings in the last 30 days. Take a measurement with your Withings device.
      </div>
    );
  }

  const categoryColors: Record<BPCategory, string> = {
    [BPCategory.OPTIMAL]: 'green',
    [BPCategory.NORMAL]: 'lightgreen',
    [BPCategory.HIGH_NORMAL]: 'yellow',
    [BPCategory.GRADE_1]: 'orange',
    [BPCategory.GRADE_2]: 'red',
    [BPCategory.GRADE_3]: 'darkred',
    [BPCategory.ISOLATED_SYSTOLIC]: 'purple',
  };

  const categoryLabels: Record<BPCategory, string> = {
    [BPCategory.OPTIMAL]: 'Optimal',
    [BPCategory.NORMAL]: 'Normal',
    [BPCategory.HIGH_NORMAL]: 'High Normal',
    [BPCategory.GRADE_1]: 'Grade 1',
    [BPCategory.GRADE_2]: 'Grade 2',
    [BPCategory.GRADE_3]: 'Grade 3',
    [BPCategory.ISOLATED_SYSTOLIC]: 'Isolated Systolic',
  };

  const date = new Date(reading.timestamp);
  const formattedTime = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div data-testid="latest-reading">
      <div data-testid="bp-value">
        {reading.data.systolic}/{reading.data.diastolic}
      </div>
      <div data-testid="pulse">{reading.data.pulse} bpm</div>
      <span
        data-testid="category-badge"
        style={{ backgroundColor: categoryColors[reading.data.category] }}
      >
        {categoryLabels[reading.data.category]}
      </span>
      <time data-testid="timestamp" dateTime={reading.timestamp}>
        {formattedTime}
      </time>
    </div>
  );
}
// ─── End stub ────────────────────────────────────────────────────────

function makeBPReading(overrides: {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  category?: BPCategory;
  timestamp?: string;
} = {}): BloodPressureMetric {
  return {
    id: 'test-reading-1',
    type: MetricType.BLOOD_PRESSURE,
    timestamp: overrides.timestamp ?? '2025-07-15T08:32:00Z',
    source: 'withings',
    data: {
      systolic: overrides.systolic ?? 128,
      diastolic: overrides.diastolic ?? 82,
      pulse: overrides.pulse ?? 72,
      category: overrides.category ?? BPCategory.GRADE_1,
    },
  };
}

describe('LatestReading component', () => {
  describe('renders BP values correctly', () => {
    it('displays systolic/diastolic as "systolic/diastolic"', () => {
      render(<LatestReading reading={makeBPReading({ systolic: 128, diastolic: 82 })} />);
      expect(screen.getByTestId('bp-value')).toHaveTextContent('128/82');
    });

    it('displays high values correctly', () => {
      render(<LatestReading reading={makeBPReading({ systolic: 185, diastolic: 125 })} />);
      expect(screen.getByTestId('bp-value')).toHaveTextContent('185/125');
    });
  });

  describe('renders pulse', () => {
    it('shows pulse with bpm unit', () => {
      render(<LatestReading reading={makeBPReading({ pulse: 72 })} />);
      expect(screen.getByTestId('pulse')).toHaveTextContent('72 bpm');
    });

    it('shows different pulse values', () => {
      render(<LatestReading reading={makeBPReading({ pulse: 95 })} />);
      expect(screen.getByTestId('pulse')).toHaveTextContent('95 bpm');
    });
  });

  describe('category badge', () => {
    const categoryTestCases = [
      { category: BPCategory.OPTIMAL, label: 'Optimal', color: 'green' },
      { category: BPCategory.NORMAL, label: 'Normal', color: 'lightgreen' },
      { category: BPCategory.HIGH_NORMAL, label: 'High Normal', color: 'yellow' },
      { category: BPCategory.GRADE_1, label: 'Grade 1', color: 'orange' },
      { category: BPCategory.GRADE_2, label: 'Grade 2', color: 'red' },
      { category: BPCategory.GRADE_3, label: 'Grade 3', color: 'darkred' },
      { category: BPCategory.ISOLATED_SYSTOLIC, label: 'Isolated Systolic', color: 'purple' },
    ];

    categoryTestCases.forEach(({ category, label, color }) => {
      it(`shows "${label}" badge for ${category}`, () => {
        render(<LatestReading reading={makeBPReading({ category })} />);
        const badge = screen.getByTestId('category-badge');
        expect(badge).toHaveTextContent(label);
      });

      it(`uses correct color for ${category}`, () => {
        render(<LatestReading reading={makeBPReading({ category })} />);
        const badge = screen.getByTestId('category-badge');
        // Inline styles in jsdom: check via style property directly
        expect((badge as HTMLElement).style.backgroundColor).toBe(color);
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state message when reading is null', () => {
      render(<LatestReading reading={null} />);
      expect(screen.getByTestId('empty-state')).toHaveTextContent(
        'No readings in the last 30 days'
      );
    });

    it('does not render BP values when no reading', () => {
      render(<LatestReading reading={null} />);
      expect(screen.queryByTestId('bp-value')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pulse')).not.toBeInTheDocument();
    });
  });

  describe('timestamp formatting', () => {
    it('renders a time element with ISO datetime attribute', () => {
      const ts = '2025-07-15T08:32:00Z';
      render(<LatestReading reading={makeBPReading({ timestamp: ts })} />);
      const timeEl = screen.getByTestId('timestamp');
      expect(timeEl).toHaveAttribute('dateTime', ts);
    });

    it('displays human-readable time', () => {
      render(
        <LatestReading reading={makeBPReading({ timestamp: '2025-07-15T14:00:00Z' })} />
      );
      const timeEl = screen.getByTestId('timestamp');
      // Should display the time in some human-readable format
      expect(timeEl.textContent).toBeTruthy();
      expect(timeEl.textContent!.length).toBeGreaterThan(0);
    });
  });
});
