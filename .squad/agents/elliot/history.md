# Elliot — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Health data app with three views:
  1. Health timeline — interactive, user-facing data visualization
  2. LLM coaching agent interface — chat/Q&A with the health coach
  3. Doctor view — clean, clinical data presentation for medical professionals
- **Key concern:** Making blood pressure, heart rate, and ECG data visually clear for both patients and doctors

## Clinical Input from Kelso

**Blood Pressure Classification (2026-04-06):**
- Use 2017 ACC/AHA thresholds (Normal, Elevated, Stage 1, Stage 2, Crisis)
- Specific mmHg boundaries are binding for all UI display
- **Disclaimer requirement:** Single footer disclaimer on timeline: "This data is for informational purposes only. BP varies by stress, activity, posture. Consult your physician."
- **Summary stats required:** Average + Median + Range + Count for 7-day summaries (not just average)
- Clinical context matters — always show context to prevent misinterpretation

## Learnings

### 2025-07-15 — MVE Frontend Build

- **Tailwind v4 + Next.js 16**: Project uses `@import "tailwindcss"` CSS-based config, not JS config files. Tailwind v4 classes work out of the box. No `tailwind.config.ts` needed.
- **Types alignment**: Turk's `MetricSummary.stats` includes `median` alongside `avg/min/max` — matched that in the SummaryCard (shows median below average). `timestamp` is `string` (ISO 8601), not `Date`.
- **Component structure**: Extracted `categoryConfig` (label + Tailwind classes) as a shared pattern in both `LatestReading` and `TimelineEntry`. If we add more components using BP categories, consider pulling this into a shared util.
- **Parallel workflow**: Turk created `src/` and `src/lib/types/metrics.ts` while I waited. Had to poll ~2 minutes for the directory to appear. Future tasks: coordinate on a branch or use a shared signal.
- **Build clean**: All 6 frontend files (hook, 4 components, page) compile with zero TypeScript errors against Turk's types on first attempt.

## Cross-Team Collaboration (2026-04-06 MVE Build)

**Turk (Backend):** All types matched exactly on first build. Your `MetricSummary` structure with `median` in stats is correct. Components render cleanly with zero TypeScript drift.

**Carla (Tester):** 72 tests passing against your components. No rendering issues found in jsdom environment. One data quality flag in classification (zero/negative values) — defer to Phase 2.

## Ready for Phase 2

Timeline component accepts optional date range filter for future coaching agent time slices and doctor view date ranges. No changes needed; feature is additive.

