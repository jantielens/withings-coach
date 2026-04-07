import type { ReadingGroup, BloodPressureData } from '@/lib/types/metrics';
import type { DiaryEntry } from '@/lib/types/diary';
import { categoryConfig } from '@/lib/ui/category-config';

export function buildBPPrompt(
  readings: ReadingGroup<BloodPressureData>[],
  dayCount: number,
  diaryEntries?: Map<string, DiaryEntry> | DiaryEntry[]
): string {
  // Normalize to array
  const diaryArray = diaryEntries instanceof Map
    ? Array.from(diaryEntries.values())
    : diaryEntries;

  const sections = [
    buildRole(),
    buildGoal(dayCount),
  ];

  const contextSection = buildPatientContext(diaryArray);
  if (contextSection) {
    sections.push(contextSection);
  }

  sections.push(
    buildDataTable(readings, dayCount, diaryArray),
    buildOutputFormat(),
  );

  return sections.join('\n\n---\n\n');
}

function buildRole(): string {
  return `## Role

You are a health data analyst specialized in cardiovascular health and blood pressure monitoring. Your role is to identify patterns, trends, and insights in blood pressure readings based on ESC/ESH 2018 classification guidelines.`;
}

function buildGoal(dayCount: number): string {
  return `## Goal

Analyze the following blood pressure data collected over ${dayCount} days. Identify:
- Overall trend (improving, worsening, or stable)
- Time-of-day patterns (morning hypertension, evening spikes)
- Reading variability and consistency
- Days of concern (Grade 2+ readings)
- Actionable coaching feedback the user can discuss with their physician

ESC/ESH Classification Reference:
- Optimal: <120/80 mmHg
- Normal: 120-129/80-84
- High Normal: 130-139/85-89
- Grade 1 Hypertension: 140-159/90-99
- Grade 2 Hypertension: 160-179/100-109
- Grade 3 Hypertension: ≥180/≥110
- Isolated Systolic: ≥140/<90

Target: 120/80 mmHg for most adults.`;
}

function buildPatientContext(diaryEntries?: DiaryEntry[]): string | null {
  if (!diaryEntries || diaryEntries.length === 0) return null;

  const lines = diaryEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => `- ${e.date}: ${e.text}`);

  return `## Patient Context

The patient provided the following diary notes for the analysis period:

${lines.join('\n')}`;
}

function buildDataTable(
  readings: ReadingGroup<BloodPressureData>[],
  dayCount: number,
  diaryEntries?: DiaryEntry[]
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
    const diary = diaryByDate.get(date) ?? '';

    return `| ${date} | ${time} | ${systolic} | ${diastolic} | ${pulse} | ${label} | ${notes} | ${diary} |`;
  });

  const dates = sorted.map((g) => g.timestamp.slice(0, 10));
  const startDate = dates[0] ?? 'N/A';
  const endDate = dates[dates.length - 1] ?? 'N/A';

  return `## Data

| Date | Time | SYS | DIA | Pulse | Category | Notes | Diary |
|------|------|-----|-----|-------|----------|-------|-------|
${rows.join('\n')}

Period: ${startDate} to ${endDate} | Total readings: ${totalReadings} | Days with data: ${dayCount}`;
}

function buildOutputFormat(): string {
  return `## Output Format

Please provide your analysis in these sections:
1. **Key Observations** (3-5 notable patterns)
2. **Trend Analysis** (improving/stable/worsening with reasoning)
3. **Time-of-Day Patterns** (morning vs evening, if detectable)
4. **Risk Assessment** (category distribution summary)
5. **Coaching Suggestions** (2-3 actionable lifestyle observations)

⚠️ IMPORTANT: This analysis is for educational and informational purposes only. It is NOT medical advice. Do not suggest medication changes or dosing. If readings consistently exceed 180/110 mmHg, recommend seeking immediate medical attention. Always encourage consulting a physician for medical decisions.`;
}
