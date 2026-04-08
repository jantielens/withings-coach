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
  }> = {}
): ReadingGroup<BloodPressureData> {
  const date = overrides.date ?? '2025-07-10';
  return {
    id: `grp-${date}`,
    timestamp: `${date}T08:00:00Z`,
    isGrouped: false,
    readings: [
      {
        id: `r-${date}`,
        type: MetricType.BLOOD_PRESSURE,
        timestamp: `${date}T08:00:00Z`,
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

const baseContext: ChatContext = {
  readings: [],
  diaryEntries: [],
  contextNotes: [],
  dateRange: { from: '2025-06-15', to: '2025-07-15', label: 'last 30 days' },
  dayCount: 0,
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
