import {
  buildChatSystemPrompt,
  sanitizeDiaryText,
  type ChatContext,
} from '@/lib/chat/system-prompt';
import { BPCategory, MetricType } from '@/lib/types/metrics';
import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import type { DiaryEntry } from '@/lib/types/diary';
import type { ContextNote } from '@/lib/types/context';

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

function makeContextNote(text: string, idx = 0): ContextNote {
  return {
    id: `ctx-${idx}`,
    userId: 'default',
    text,
    orderIdx: idx,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

function makeGroupedReading(
  date: string,
  individualReadings: { systolic: number; diastolic: number; pulse: number }[],
  avg: { systolic: number; diastolic: number; pulse: number; category: BPCategory }
): ReadingGroup<BloodPressureData> {
  return {
    id: `grp-${date}`,
    timestamp: `${date}T08:00:00Z`,
    isGrouped: true,
    readings: individualReadings.map((r, i) => ({
      id: `r-${date}-${i}`,
      type: MetricType.BLOOD_PRESSURE,
      timestamp: `${date}T08:0${i}:00Z`,
      source: 'withings' as const,
      data: {
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.pulse,
        category: avg.category,
      },
    })),
    average: avg,
  };
}

const baseContext: ChatContext = {
  readings: [],
  diaryEntries: [],
  contextNotes: [],
  dateRange: { from: '2025-06-15', to: '2025-07-15', label: 'last 30 days' },
  dayCount: 0,
  timezone: 'UTC',
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('buildChatSystemPrompt', () => {
  it('contains ESC/ESH classification reference', () => {
    const prompt = buildChatSystemPrompt(baseContext);
    expect(prompt).toContain('ESC/ESH 2018 Classification Reference');
    expect(prompt).toContain('Optimal');
    expect(prompt).toContain('Grade 1 Hypertension');
  });

  it('contains safety disclaimer', () => {
    const prompt = buildChatSystemPrompt(baseContext);
    expect(prompt).toContain('Important Boundaries');
    expect(prompt).toContain('NOT medical advice');
    expect(prompt).toContain('consulting a physician');
  });

  it('includes data table when readings are provided', () => {
    const ctx: ChatContext = {
      ...baseContext,
      readings: [makeReading({ date: '2025-07-10' })],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('Blood Pressure Data');
    expect(prompt).toContain('| 2025-07-10');
    expect(prompt).toContain('125');
    expect(prompt).toContain('82');
  });

  it('includes diary context when diary entries are provided', () => {
    const ctx: ChatContext = {
      ...baseContext,
      diaryEntries: [makeDiaryEntry('2025-07-10', 'Felt dizzy this morning')],
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('Patient Diary');
    expect(prompt).toContain('Felt dizzy this morning');
  });

  it('includes medical records section when context notes are provided', () => {
    const ctx: ChatContext = {
      ...baseContext,
      contextNotes: [makeContextNote('Takes lisinopril 10mg daily')],
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('Patient Medical Records');
    expect(prompt).toContain('Takes lisinopril 10mg daily');
  });

  it('includes Dutch language note when diary is present', () => {
    const ctx: ChatContext = {
      ...baseContext,
      diaryEntries: [makeDiaryEntry('2025-07-10', 'Vandaag goed geslapen')],
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('Dutch');
  });

  it('includes Dutch language note when context notes are present', () => {
    const ctx: ChatContext = {
      ...baseContext,
      contextNotes: [makeContextNote('Diagnose: hypertensie')],
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('Dutch');
  });

  it('does NOT include Dutch language note when no diary and no context', () => {
    const prompt = buildChatSystemPrompt(baseContext);
    expect(prompt).not.toContain('Dutch');
  });

  it('does NOT include diary section when no diary entries', () => {
    const prompt = buildChatSystemPrompt(baseContext);
    expect(prompt).not.toContain('Patient Diary');
  });

  it('handles empty readings array (no data table)', () => {
    const prompt = buildChatSystemPrompt(baseContext);
    expect(prompt).not.toContain('Blood Pressure Data');
  });

  it('includes individual readings in Notes column for grouped sessions', () => {
    const ctx: ChatContext = {
      ...baseContext,
      readings: [
        makeGroupedReading(
          '2025-07-10',
          [
            { systolic: 130, diastolic: 85, pulse: 70 },
            { systolic: 124, diastolic: 80, pulse: 68 },
            { systolic: 121, diastolic: 81, pulse: 69 },
          ],
          { systolic: 125, diastolic: 82, pulse: 69, category: BPCategory.NORMAL }
        ),
      ],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('Avg of 3 (130/85, 124/80, 121/81)');
  });

  it('shows Single in Notes column for ungrouped reading', () => {
    const ctx: ChatContext = {
      ...baseContext,
      readings: [makeReading({ date: '2025-07-10' })],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('| Single |');
  });

  it('includes first-reading effect guideline in role section', () => {
    const prompt = buildChatSystemPrompt(baseContext);
    expect(prompt).toContain('first-reading effect');
    expect(prompt).toContain('white coat artifact');
  });
});

describe('timezone handling', () => {
  it('formats time in Europe/Brussels timezone (CEST = UTC+2)', () => {
    const ctx: ChatContext = {
      ...baseContext,
      timezone: 'Europe/Brussels',
      readings: [makeReading({ timestamp: '2025-07-10T06:00:00Z', date: '2025-07-10' })],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('2025-07-10');
    expect(prompt).toContain('08:00');
  });

  it('formats time in America/New_York timezone (EDT = UTC-4)', () => {
    const ctx: ChatContext = {
      ...baseContext,
      timezone: 'America/New_York',
      readings: [makeReading({ timestamp: '2025-07-10T06:00:00Z', date: '2025-07-10' })],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('2025-07-10');
    expect(prompt).toContain('02:00');
  });

  it('formats time in UTC timezone', () => {
    const ctx: ChatContext = {
      ...baseContext,
      timezone: 'UTC',
      readings: [makeReading({ timestamp: '2025-07-10T06:00:00Z', date: '2025-07-10' })],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('2025-07-10');
    expect(prompt).toContain('06:00');
  });

  it('shifts date across midnight boundary for Europe/Brussels timezone', () => {
    const ctx: ChatContext = {
      ...baseContext,
      timezone: 'Europe/Brussels',
      readings: [makeReading({ timestamp: '2025-07-10T23:30:00Z', date: '2025-07-10' })],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    // In Brussels (CEST = UTC+2), 23:30 UTC = 01:30 on July 11
    expect(prompt).toContain('2025-07-11');
    expect(prompt).toContain('01:30');
    expect(prompt).not.toContain('| 2025-07-10');
    expect(prompt).not.toContain('23:30');
  });

  it('matches diary entry by local date when timezone shifts date across midnight', () => {
    const ctx: ChatContext = {
      ...baseContext,
      timezone: 'Europe/Brussels',
      readings: [makeReading({ timestamp: '2025-07-10T23:30:00Z', date: '2025-07-10' })],
      diaryEntries: [
        makeDiaryEntry('2025-07-11', 'Slept well despite late measurement'),
      ],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    // Reading's local date in Brussels is 2025-07-11, so it should match the 07-11 diary
    const lines = prompt.split('\n');
    const dataRow = lines.find((l) => l.includes('| 2025-07-11') && l.includes('01:30'));
    expect(dataRow).toBeDefined();
    expect(dataRow).toContain('Slept well despite late measurement');
  });

  it('does NOT match diary entry by UTC date when timezone shifts date across midnight', () => {
    const ctx: ChatContext = {
      ...baseContext,
      timezone: 'Europe/Brussels',
      readings: [makeReading({ timestamp: '2025-07-10T23:30:00Z', date: '2025-07-10' })],
      diaryEntries: [
        makeDiaryEntry('2025-07-10', 'Wrong day diary'),
      ],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    // The data row is for 2025-07-11, so the 07-10 diary should NOT appear in the table row
    const lines = prompt.split('\n');
    const dataRow = lines.find((l) => l.includes('| 2025-07-11') && l.includes('01:30'));
    expect(dataRow).toBeDefined();
    expect(dataRow).not.toContain('Wrong day diary');
  });

  it('defaults to UTC behavior when timezone is UTC', () => {
    const ctx: ChatContext = {
      ...baseContext,
      timezone: 'UTC',
      readings: [makeReading({ date: '2025-07-10' })],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('| 2025-07-10');
    expect(prompt).toContain('08:00');
  });

  it('uses "Time (local)" column header instead of "Time (UTC)"', () => {
    const ctx: ChatContext = {
      ...baseContext,
      timezone: 'Europe/Brussels',
      readings: [makeReading({ date: '2025-07-10' })],
      dayCount: 1,
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('Time (local)');
    expect(prompt).not.toContain('Time (UTC)');
  });
});

describe('sanitizeDiaryText', () => {
  it('collapses multi-line text into pipe-delimited line', () => {
    const result = sanitizeDiaryText('Line one\nLine two\nLine three');
    expect(result).toBe('Line one | Line two | Line three');
  });

  it('strips bullet markers (-, *, •)', () => {
    const result = sanitizeDiaryText('- Item A\n* Item B\n• Item C');
    expect(result).toBe('Item A | Item B | Item C');
  });

  it('handles mixed content with empty lines', () => {
    const result = sanitizeDiaryText('First\n\nSecond\n  \nThird');
    expect(result).toBe('First | Second | Third');
  });

  it('handles single-line text unchanged', () => {
    const result = sanitizeDiaryText('Just a simple note');
    expect(result).toBe('Just a simple note');
  });

  it('trims whitespace from each line', () => {
    const result = sanitizeDiaryText('  padded  \n  spaces  ');
    expect(result).toBe('padded | spaces');
  });
});
