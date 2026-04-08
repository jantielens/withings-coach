import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import type { DiaryEntry } from '@/lib/types/diary';
import type { ContextNote } from '@/lib/types/context';
import type { ResolvedDateRange } from './time-range';
import { categoryConfig } from '@/lib/ui/category-config';

export interface ChatContext {
  readings: ReadingGroup<BloodPressureData>[];
  diaryEntries: DiaryEntry[];
  contextNotes: ContextNote[];
  dateRange: ResolvedDateRange;
  dayCount: number;
}

export function buildChatSystemPrompt(context: ChatContext): string {
  const { readings, diaryEntries, contextNotes, dateRange, dayCount } = context;
  const hasContext = contextNotes.length > 0;
  const hasDiary = diaryEntries.length > 0;
  const todayISO = dateRange.to;

  const sections: string[] = [
    buildRole(hasContext, hasDiary, todayISO),
    buildClassificationRef(),
  ];

  const generalCtx = buildGeneralContext(contextNotes);
  if (generalCtx) sections.push(generalCtx);

  const diaryCtx = buildDiaryContext(diaryEntries);
  if (diaryCtx) sections.push(diaryCtx);

  if (readings.length > 0) {
    sections.push(buildDataTable(readings, dayCount, dateRange, diaryEntries));
  }

  sections.push(buildSafetyDisclaimer());

  return sections.join('\n\n---\n\n');
}

// -- Internals ----------------------------------------------------------------

function buildRole(hasContext: boolean, hasDiary: boolean, today: string): string {
  let role = `## Role

You are a supportive and knowledgeable blood pressure health coach. Today is ${today}. You help the user understand their blood pressure readings, spot trends, and make sense of their data — like a well-informed friend who happens to know a lot about cardiovascular health.

**Guidelines:**
- Be conversational, warm, and encouraging — not clinical or robotic.
- Answer questions directly. If the user asks something specific, address it first.
- Reference the user's actual data when giving insights.
- Use the ESC/ESH 2018 classification to contextualise readings.
- Only discuss information present in the provided data and context — do not speculate about data you have not seen.
- Keep responses concise unless the user asks for detail.`;

  if (hasContext || hasDiary) {
    role += `

**Language note:** The patient's medical records and diary entries may be in Dutch. Read, interpret, and reference this content accurately. Do not skip or summarize it away — it contains important clinical details.`;
  }

  return role;
}

function buildClassificationRef(): string {
  return `## ESC/ESH 2018 Classification Reference

| Category | Systolic (mmHg) | Diastolic (mmHg) |
|---|---|---|
| Optimal | < 120 | < 80 |
| Normal | 120–129 | 80–84 |
| High Normal | 130–139 | 85–89 |
| Grade 1 Hypertension | 140–159 | 90–99 |
| Grade 2 Hypertension | 160–179 | 100–109 |
| Grade 3 Hypertension | ≥ 180 | ≥ 110 |
| Isolated Systolic | ≥ 140 | < 90 |

Target for most adults: **120/80 mmHg**.`;
}

function buildGeneralContext(notes: ContextNote[]): string | null {
  if (notes.length === 0) return null;

  const bullets = notes.map((n) => `- ${n.text}`);

  return `## Patient Medical Records (General Context)

> These are the patient's medical records, diagnoses, medications, and clinician notes. Reference specific items when they are relevant to answering the user's question.

${bullets.join('\n')}`;
}

function buildDiaryContext(entries: DiaryEntry[]): string | null {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const blocks = sorted.map(
    (e) => `**${e.date}:**\n> ${sanitizeDiaryText(e.text)}`
  );

  return `## Patient Diary

${blocks.join('\n\n')}`;
}

/** Collapse multi-line diary text into a single pipe-delimited line. */
export function sanitizeDiaryText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((line) => line.length > 0)
    .join(' | ');
}

function buildDataTable(
  readings: ReadingGroup<BloodPressureData>[],
  dayCount: number,
  dateRange: ResolvedDateRange,
  diaryEntries: DiaryEntry[]
): string {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const totalReadings = sorted.reduce((sum, g) => sum + g.readings.length, 0);

  const diaryByDate = new Map<string, string>();
  for (const entry of diaryEntries) {
    diaryByDate.set(entry.date, entry.text);
  }

  const rows = sorted.map((group) => {
    const dt = new Date(group.timestamp);
    const date = dt.toISOString().slice(0, 10);
    const time = dt.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const { systolic, diastolic, pulse, category } = group.average;
    const label = categoryConfig[category].label;
    const notes = group.isGrouped ? `Avg of ${group.readings.length}` : 'Single';
    const rawDiary = diaryByDate.get(date) ?? '';
    const diary = rawDiary ? sanitizeDiaryText(rawDiary) : '';

    return `| ${date} | ${time} | ${systolic} | ${diastolic} | ${pulse} | ${label} | ${notes} | ${diary} |`;
  });

  return `## Blood Pressure Data (${dateRange.label})

| Date | Time | SYS | DIA | Pulse | Category | Notes | Diary |
|------|------|-----|-----|-------|----------|-------|-------|
${rows.join('\n')}

Period: ${dateRange.from} to ${dateRange.to} | Total readings: ${totalReadings} | Days with data: ${dayCount}`;
}

function buildSafetyDisclaimer(): string {
  return `## Important Boundaries

- This conversation is for **educational and informational purposes only** — it is NOT medical advice.
- Never suggest medication changes, dosing adjustments, or diagnoses.
- If readings consistently exceed **180/110 mmHg**, recommend the user seek immediate medical attention.
- Always encourage consulting a physician for medical decisions.`;
}
