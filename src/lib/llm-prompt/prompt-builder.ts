import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import type { DiaryEntry } from '@/lib/types/diary';
import type { ContextNote } from '@/lib/types/context';
import { categoryConfig } from '@/lib/ui/category-config';

export function buildBPPrompt(
  readings: ReadingGroup<BloodPressureData>[],
  dayCount: number,
  diaryEntries?: Map<string, DiaryEntry> | DiaryEntry[],
  contextNotes?: ContextNote[],
  timezone?: string
): string {
  const tz = resolveTimezone(timezone);
  // Normalize to array
  const diaryArray = diaryEntries instanceof Map
    ? Array.from(diaryEntries.values())
    : diaryEntries;

  const hasContext = !!(contextNotes && contextNotes.length > 0);
  const hasDiary = !!(diaryArray && diaryArray.length > 0);

  const sections = [
    buildRole(hasContext, hasDiary),
    buildGoal(dayCount, hasContext),
  ];

  const generalContext = buildGeneralContext(contextNotes);
  if (generalContext) {
    sections.push(generalContext);
  }

  const contextSection = buildPatientContext(diaryArray);
  if (contextSection) {
    sections.push(contextSection);
  }

  sections.push(
    buildDataTable(readings, dayCount, diaryArray, tz),
    buildOutputFormat(hasContext),
  );

  return sections.join('\n\n---\n\n');
}

function buildRole(hasContext: boolean, hasDiary: boolean): string {
  let role = `## Role

You are a health data analyst specialized in cardiovascular health and blood pressure monitoring. Your role is to identify patterns, trends, and insights in blood pressure readings based on ESC/ESH 2018 classification guidelines.`;

  if (hasContext || hasDiary) {
    role += `\n\n**Language note:** The patient's medical records and diary entries are written in Dutch. Read, interpret, and reference this Dutch-language content in your analysis. Do not skip or summarize it away — it contains critical clinical details.`;
  }

  return role;
}

function buildGoal(dayCount: number, hasContext: boolean): string {
  let goal = `## Goal

Analyze the following blood pressure data collected over ${dayCount} days. Identify:
- Overall trend (improving, worsening, or stable)
- Time-of-day patterns (morning hypertension, evening spikes)
- Reading variability and consistency
- Days of concern (Grade 2+ readings)
- Actionable coaching feedback the user can discuss with their physician`;

  if (hasContext) {
    goal += `

**IMPORTANT:** A "General Context" section is provided below containing the patient's medical records (e.g., cardiologist reports, medications, diagnoses). You MUST incorporate this information into every part of your analysis — it is essential for interpreting the readings correctly.`;
  }

  goal += `

ESC/ESH Classification Reference:
- Optimal: <120/80 mmHg
- Normal: 120-129/80-84
- High Normal: 130-139/85-89
- Grade 1 Hypertension: 140-159/90-99
- Grade 2 Hypertension: 160-179/100-109
- Grade 3 Hypertension: ≥180/≥110
- Isolated Systolic: ≥140/<90

Target: 120/80 mmHg for most adults.`;

  return goal;
}

function sanitizeDiaryText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((line) => line.length > 0)
    .join(' | ');
}

function buildGeneralContext(contextNotes?: ContextNote[]): string | null {
  if (!contextNotes || contextNotes.length === 0) return null;

  const bullets = contextNotes.map((n) => `- ${n.text}`);

  return `## ⚠️ General Context — CRITICAL: Patient Medical Records

> **Read this section carefully.** It contains the patient's medical history, diagnoses, medications, and cardiologist notes. These details are essential for interpreting the blood pressure data below. Reference specific items from this context throughout your analysis.

${bullets.join('\n')}`;
}

/** Validate an IANA timezone string. Returns the timezone if valid, 'UTC' otherwise. */
function resolveTimezone(tz: string | undefined | null): string {
  if (!tz) return 'UTC';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

function buildPatientContext(diaryEntries?: DiaryEntry[]): string | null {
  if (!diaryEntries || diaryEntries.length === 0) return null;

  const blocks = diaryEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => `**${e.date}:**\n> ${sanitizeDiaryText(e.text)}`);

  return `## Patient Context

The patient provided the following diary notes for the analysis period:

${blocks.join('\n\n')}`;
}

function buildDataTable(
  readings: ReadingGroup<BloodPressureData>[],
  dayCount: number,
  diaryEntries?: DiaryEntry[],
  timezone: string = 'UTC'
): string {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const totalReadings = sorted.reduce((sum, g) => sum + g.readings.length, 0);

  // Build a map of date → diary text for quick lookup
  const diaryByDate = new Map<string, string>();
  if (diaryEntries) {
    for (const entry of diaryEntries) {
      diaryByDate.set(entry.date, entry.text);
    }
  }

  const rows = sorted.map((group) => {
    const d = new Date(group.timestamp);
    const date = d.toLocaleDateString('sv-SE', { timeZone: timezone });
    const time = d.toLocaleTimeString('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
    const { systolic, diastolic, pulse, category } = group.average;
    const label = categoryConfig[category].label;
    const notes = group.isGrouped ? `Avg of ${group.readings.length}` : 'Single';
    const rawDiary = diaryByDate.get(date) ?? '';
    const diary = rawDiary ? sanitizeDiaryText(rawDiary) : '';

    return `| ${date} | ${time} | ${systolic} | ${diastolic} | ${pulse} | ${label} | ${notes} | ${diary} |`;
  });

  const dates = sorted.map((g) => g.timestamp.slice(0, 10));
  const startDate = dates[0] ?? 'N/A';
  const endDate = dates[dates.length - 1] ?? 'N/A';

  return `## Data

| Date | Time (local) | SYS | DIA | Pulse | Category | Notes | Diary |
|------|------|-----|-----|-------|----------|-------|-------|
${rows.join('\n')}

Period: ${startDate} to ${endDate} | Total readings: ${totalReadings} | Days with data: ${dayCount}`;
}

function buildOutputFormat(hasContext: boolean): string {
  let sections = `## Output Format

Please provide your analysis in these sections:
1. **Key Observations** (3-5 notable patterns)
2. **Trend Analysis** (improving/stable/worsening with reasoning)
3. **Time-of-Day Patterns** (morning vs evening, if detectable)
4. **Risk Assessment** (category distribution summary)
5. **Coaching Suggestions** (2-3 actionable lifestyle observations)`;

  if (hasContext) {
    sections += `
6. **Context Integration** (explain how the patient's medical records, medications, and diary entries relate to the observed BP trends — cite specific details from the General Context section)`;
  }

  sections += `

⚠️ IMPORTANT: This analysis is for educational and informational purposes only. It is NOT medical advice. Do not suggest medication changes or dosing. If readings consistently exceed 180/110 mmHg, recommend seeking immediate medical attention. Always encourage consulting a physician for medical decisions.`;

  return sections;
}
