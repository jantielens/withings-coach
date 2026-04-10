import { buildBPPrompt } from '@/lib/llm-prompt/prompt-builder';
import { BPCategory, MetricType } from '@/lib/types/metrics';
import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import type { DiaryEntry } from '@/lib/types/diary';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeReading(
  overrides: Partial<{
    systolic: number;
    diastolic: number;
    pulse: number;
    category: BPCategory;
    date: string;
    timestamp: string;
  }> = {}
): ReadingGroup<BloodPressureData> {
  const date = overrides.date ?? '2025-07-10';
  const ts = overrides.timestamp ?? `${date}T08:00:00Z`;
  return {
    id: `grp-${date}`,
    timestamp: ts,
    isGrouped: false,
    readings: [
      {
        id: `r-${date}`,
        type: MetricType.BLOOD_PRESSURE,
        timestamp: ts,
        source: 'withings',
        data: {
          systolic: overrides.systolic ?? 125,
          diastolic: overrides.diastolic ?? 82,
          pulse: overrides.pulse ?? 72,
          category: overrides.category ?? BPCategory.NORMAL,
        },
      },
    ],
    average: {
      systolic: overrides.systolic ?? 125,
      diastolic: overrides.diastolic ?? 82,
      pulse: overrides.pulse ?? 72,
      category: overrides.category ?? BPCategory.NORMAL,
    },
  };
}

function makeDiaryEntry(date: string, text: string): DiaryEntry {
  return {
    id: `diary-${date}`,
    userId: 'default',
    date,
    text,
    createdAt: `${date}T12:00:00Z`,
    updatedAt: `${date}T12:00:00Z`,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('buildBPPrompt', () => {
  const readings = [makeReading({ date: '2025-07-10' })];

  it('produces a prompt with data table when readings are provided', () => {
    const prompt = buildBPPrompt(readings, 1);
    expect(prompt).toContain('Data');
    expect(prompt).toContain('125');
    expect(prompt).toContain('82');
  });

  it('includes ESC/ESH classification reference', () => {
    const prompt = buildBPPrompt(readings, 1);
    expect(prompt).toContain('Optimal');
    expect(prompt).toContain('Grade 1 Hypertension');
  });

  it('includes safety disclaimer', () => {
    const prompt = buildBPPrompt(readings, 1);
    expect(prompt).toContain('NOT medical advice');
  });

  describe('timezone handling', () => {
    it('formats time in Europe/Brussels timezone (CEST = UTC+2)', () => {
      const r = [makeReading({ timestamp: '2025-07-10T06:00:00Z', date: '2025-07-10' })];
      const prompt = buildBPPrompt(r, 1, undefined, undefined, 'Europe/Brussels');
      expect(prompt).toContain('2025-07-10');
      expect(prompt).toContain('08:00');
    });

    it('formats time in America/New_York timezone (EDT = UTC-4)', () => {
      const r = [makeReading({ timestamp: '2025-07-10T06:00:00Z', date: '2025-07-10' })];
      const prompt = buildBPPrompt(r, 1, undefined, undefined, 'America/New_York');
      expect(prompt).toContain('2025-07-10');
      expect(prompt).toContain('02:00');
    });

    it('defaults to UTC when no timezone is provided', () => {
      const r = [makeReading({ timestamp: '2025-07-10T06:00:00Z', date: '2025-07-10' })];
      const prompt = buildBPPrompt(r, 1);
      expect(prompt).toContain('2025-07-10');
      expect(prompt).toContain('06:00');
    });

    it('shifts date across midnight boundary for Europe/Brussels timezone', () => {
      const r = [makeReading({ timestamp: '2025-07-10T23:30:00Z', date: '2025-07-10' })];
      const prompt = buildBPPrompt(r, 1, undefined, undefined, 'Europe/Brussels');
      // In Brussels (CEST = UTC+2), 23:30 UTC = 01:30 on July 11
      expect(prompt).toContain('2025-07-11');
      expect(prompt).toContain('01:30');
      expect(prompt).not.toContain('| 2025-07-10');
      expect(prompt).not.toContain('23:30');
    });

    it('uses "Time (local)" column header instead of "Time (UTC)"', () => {
      const prompt = buildBPPrompt(readings, 1, undefined, undefined, 'Europe/Brussels');
      expect(prompt).toContain('Time (local)');
      expect(prompt).not.toContain('Time (UTC)');
    });

    it('matches diary entry by local date when timezone shifts date across midnight', () => {
      const r = [makeReading({ timestamp: '2025-07-10T23:30:00Z', date: '2025-07-10' })];
      const diary = [makeDiaryEntry('2025-07-11', 'Late night measurement note')];
      const prompt = buildBPPrompt(r, 1, diary, undefined, 'Europe/Brussels');
      // Reading's local date in Brussels is 2025-07-11
      const lines = prompt.split('\n');
      const dataRow = lines.find((l) => l.includes('| 2025-07-11') && l.includes('01:30'));
      expect(dataRow).toBeDefined();
      expect(dataRow).toContain('Late night measurement note');
    });
  });
});
