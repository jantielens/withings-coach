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

### 2025-07-26 — General Context Notes UI (Persistent Non-Time-Bound Notes)

- **`src/lib/types/context.ts` already existed**: Turk created `ContextNote` type with `id`, `userId`, `text`, `orderIdx`, `createdAt`, `updatedAt` — and `ContextNoteInput`. No changes needed.
- **Created `src/hooks/useContextNotes.ts`**: Simpler version of `useDiaryEntries` — no date range needed. Fetches all notes via `GET /api/context?userId=default`, returns `{ notes, createNote, deleteNote, isLoading }`. Same silent-fallback pattern for when API isn't available yet. `createNote(text)` → POST, `deleteNote(id)` → DELETE with auto-refetch after mutations.
- **Created `src/components/ContextNotesPanel.tsx`**: Collapsible section titled "📋 General Context" with count badge. Collapsed by default. Shows list of existing notes with hover-reveal 🗑️ delete button, empty state message, and an input area (2-row textarea + "Add" button). 500-char limit with counter. Supports Cmd/Ctrl+Enter to add. Styled with subtle gray borders and small text matching LLMPromptDebugger aesthetic.
- **Modified `src/components/LLMPromptDebugger.tsx`**: Added `contextNotes`, `onCreateContextNote`, `onDeleteContextNote`, `isContextLoading` props. Renders `<ContextNotesPanel>` inside the expanded view above the prompt textarea. Passes `contextNotes` to `buildBPPrompt` — Turk already updated prompt-builder to accept and render them as a "General Background Context" section.
- **Modified `src/app/page.tsx`**: Added `useContextNotes()` hook. Passes `contextNotes`, `createContextNote`, `deleteContextNote`, and `isContextLoading` down to `<LLMPromptDebugger>`.
- **Turk parallel work aligned**: Both `context.ts` types and `prompt-builder.ts` `buildGeneralContext()` function were already in place — zero drift on integration.
- **Build & Tests**: ✅ TypeScript clean, `npm run build` passes, zero new dependencies.

### 2025-07-25 — Diary UI (Inline Editing + Data Hook)

- **Created `src/lib/types/diary.ts`**: Already existed from Turk's parallel work — `DiaryEntry` type with `id`, `userId`, `date` (YYYY-MM-DD), `text`, `createdAt`, `updatedAt`. No changes needed.
- **Created `src/hooks/useDiaryEntries.ts`**: Data hook fetching diary entries for a date range via `GET /api/diary?from=...&to=...&userId=default`. Returns `Map<string, DiaryEntry>` keyed by YYYY-MM-DD for O(1) lookup. Includes `saveEntry` (POST) and `deleteEntry` (DELETE) with auto-refetch after mutations. Fails silently if API not available (Turk building in parallel).
- **Created `src/components/DiaryNote.tsx`**: Two-state inline component — display mode (text + hover-reveal ✏️/🗑️ icons) and edit mode (auto-expanding textarea, 500-char limit with counter, Save/Cancel buttons). Empty state shows subtle "📝 Add note" text button. Supports Cmd/Ctrl+Enter to save and Escape to cancel.
- **Modified `src/components/DaySummary.tsx`**: Added `diaryEntry`, `onSaveDiary`, `onDeleteDiary` optional props. DiaryNote renders at the bottom of the expanded section with a subtle top border, below tier-2 readings. Timeline line continuation logic adjusted — the last tier-2 reading only omits the bottom line if there's no diary section.
- **Modified `src/components/Timeline.tsx`**: Threaded `diaryEntries` Map and save/delete callbacks through `TimelineContent` to each `DaySummary`. Computed `dateStr` from first reading's timestamp for diary Map lookup.
- **Modified `src/app/page.tsx`**: Added `useDiaryEntries` hook. Computes date range from readings data (min/max dates). Passes `diaryEntries`, `saveDiary`, `deleteDiary` to Timeline and diary entries to LLMPromptDebugger.
- **Modified `src/lib/llm-prompt/prompt-builder.ts`**: Updated `buildBPPrompt` to accept `Map<string, DiaryEntry> | DiaryEntry[]` — normalizes to array internally. Already had diary support from Turk's work; just widened the type signature.
- **Modified `src/components/LLMPromptDebugger.tsx`**: Added optional `diaryEntries` prop, passes it through to `buildBPPrompt`.
- **Build & Tests**: ✅ TypeScript clean, `npm run build` passes, zero new dependencies.

### 2025-07-25 — LLM Prompt Debugger

- **Created `src/lib/llm-prompt/prompt-builder.ts`**: Pure function `buildBPPrompt(readings, dayCount)` that assembles a 4-section prompt (Role → Goal → Data table → Output format) from live `ReadingGroup<BloodPressureData>[]` data. Reuses `categoryConfig` labels from `category-config.ts` for ESC/ESH category names. Data is sorted chronologically and rendered as a Markdown table with date, time, SYS, DIA, pulse, category, and grouped-reading notes. Includes a summary stats line with period, total readings, and day count.
- **Created `src/components/LLMPromptDebugger.tsx`**: Collapsible section (collapsed by default) with expand/collapse toggle. Shows character count + estimated token count (~4 chars/token), a "Copy to Clipboard" button with 2-second "Copied!" feedback, and a read-only monospace `<textarea>`. Styled as a subtle developer tool (gray border, small text, monospace font) — not a primary feature.
- **Integrated in `page.tsx`**: Rendered between Timeline and disclaimer footer, guarded by `!isLoading && data.length > 0`. Passes `readings={data}` and `dayCount={dayCount}` as props.
- **Prompt uses `useMemo`**: Avoids recalculating the prompt string on every render — only recomputes when `readings` or `dayCount` change.
- **Clipboard fallback**: Uses `navigator.clipboard.writeText` with a `document.execCommand('copy')` fallback for older browsers.
- **Build & Tests**: ✅ TypeScript clean, `npm run build` passes, zero new dependencies.

### 2025-07-24 — Ideal BP Reference Markers (120/80 mmHg)

- **Added subtle ideal BP reference lines to RangeBar**: Two 1px `bg-gray-400/40` vertical lines at 120 mmHg (systolic ideal) and 80 mmHg (diastolic ideal), positioned using the same `((value - scaleMin) / scaleRange) * 100` math as the bar segments. Lines render behind colored segments — the ideal markers use no z-index while diastolic gets `z-[1]` and systolic gets `z-[2]`, preserving the existing layering.
- **Works in both compact and normal modes**: No conditional logic needed — the ideal lines render inside the bar track div which adapts height via `compact ? 'h-2' : 'h-1.5'`. Lines use `h-full` so they fill whatever height the track has.
- **Scale header integration in Timeline.tsx**: Added matching `bg-gray-400/40` reference lines at 42.86% (120 mmHg) and 14.29% (80 mmHg) in the sticky scale header. Also added "80" tick label at 14.29% — far enough from "60 mmHg" (0%) and "120" (42.86%) to avoid overlap.
- **Tooltip skipped for markers**: The 1px lines are too narrow for reliable hover targets. The scale header labels (60, 80, 120, 140, 200) and the ZoneLegend disclaimer provide enough context.
- **ZoneLegend disclaimer**: Added `"Target: 120/80 mmHg · Consult your doctor for personal goals"` as `text-xs text-gray-400` below the zone color swatches. Wrapped the legend in a flex-col container to stack the zones and disclaimer.
- **Constants extracted**: `IDEAL_SYSTOLIC = 120` and `IDEAL_DIASTOLIC = 80` as named constants at module level for clarity and future reuse.
- **Build & Tests**: ✅ TypeScript clean, build passes, zero new dependencies.

### 2025-07-23 — Quick UI Polish (4 items)

- **Reverted tier-1 dot size variation**: All dots back to uniform `w-4 h-4` with `ring-2 ring-white`. Removed the conditional `w-5 h-5 ring-offset-1 ring-red-300` for high-risk days — the size difference was too subtle to be useful and added visual noise.
- **Re-introduced ⚠️ warning icon for Grade 2+ days**: Placed inline inside the date label cell (`flex items-center gap-1`) before the date text. This keeps it visually between the dot and date without adding a grid column or breaking alignment.
- **Removed low-confidence opacity fade**: Deleted `opacity-70` for days with <3 readings. The measurement dots on bars already communicate data density — the fade was redundant and made low-data days harder to read.
- **Increased horizontal gap between bars**: Changed `gap-x-3` → `gap-x-5` in both the day row grid (DaySummary) and the sticky scale header grid (Timeline) — gives the timeline bar and range bar more breathing room.
- **Added "mmHg" unit to spread scale**: First label in the range bar scale header changed from `80` to `80 mmHg` with `whitespace-nowrap` to prevent wrapping. Other labels remain numbers-only.
- **Cleanup**: Removed unused `lowConfidence` variable from DaySummary.

### 2025-07-22 — "Less Is More" UI Simplifications

- **Removed badge text column from collapsed rows**: The severity label ("Grade 1", "High Normal", etc.) was redundant — the tier-1 dot color, TimelineBar colors, and ZoneLegend already encode it. Deleted the `<span>` and its `110px` grid column. Also removed the separate `20px` warning icon column.
- **Merged warning signal into tier-1 dot**: For Grade 2+ / ISH days, the dot now grows from `w-4 h-4` to `w-5 h-5` and gets `ring-offset-1 ring-red-300` — a subtle red ring that draws the eye without a separate icon. Conditional className string handles both states.
- **Grid simplified from 6 → 4 columns (desktop)**: `grid-cols-[100px_minmax(60px,1fr)_minmax(60px,1fr)_auto]` — date, timeline bar, range bar, chevron. Both bars now get `1fr` (equal width, fill available space). Mobile drops the range bar column as before.
- **Added rich `aria-label` to tier-1 dot**: `formatDayLong()` helper provides "Monday, April 6" format. Combined with worst category label and reading count for screen readers. Native `title` tooltip kept for mouse users.
- **Sticky scale header row in Timeline.tsx**: Thin ruler row with `0h / 12h / 24h` labels over the timeline bar column and `80 / 120 / 140 / 200` (ESC thresholds) over the range bar column. Uses `sticky top-16 z-40` to stay visible under the page header. `bg-white/95 backdrop-blur-sm` for a subtle frosted effect. Range bar scale hidden on mobile.
- **Removed `dominantCategory` import**: No longer needed in DaySummary since the badge column is gone. Only `worstCategory` and `hasHighRiskCategory` remain.
- **No test changes needed**: All 65 existing tests pass — the changes are CSS/layout-only in DaySummary and Timeline, neither of which has dedicated tests.

### 2025-07-22 — RangeBar Hover Tooltips

- **Added React state-based tooltips to RangeBar**: Same pattern as TimelineBar — `useState<'sys' | 'dia' | null>` tracks which segment is hovered, `onMouseEnter`/`onMouseLeave` on each bar segment toggles it. Tooltip positioned `bottom-full mb-2` centered with `left-1/2 -translate-x-1/2`, `z-50`, and `pointer-events-none`.
- **Overlap detection**: Added `rangesOverlap()` helper. When systolic and diastolic ranges overlap on the scale, hovering the systolic bar (which is rendered on top) shows both systolic and diastolic values. Diastolic-only tooltip shows when hovering non-overlapping diastolic areas.
- **overflow-hidden → overflow-visible**: Changed the bar track container from `overflow-hidden` to `overflow-visible` so tooltips can render above the bar. Individual bar segments already had `rounded-full`, so visual appearance is unchanged.
- **Works in compact mode**: Tooltips work in both `compact={true}` (collapsed day summary, h-2 bar) and normal mode (h-1.5 bar). No conditional logic needed — same hover behavior in both.

### 2025-07-18 — TimelineBar Dot Markers

- **Replaced tick marks with outlined dot markers**: Swapped the 2px white vertical lines in TimelineBar with small white circles (`w-1.5 h-1.5 rounded-full bg-white border border-gray-800`). Centered vertically with `top-1/2 -translate-y-1/2`, added `z-10` to sit above colored segments. Keeps `pointer-events-none` so tooltips from segments still work.
- **Surgical CSS-only change**: No logic, props, or data flow changed — just the tick `<div>` className swap. Build passed on first attempt.

### 2025-07-15 — ESC/ESH 2018 + ReadingGroup UI

- **Category config extracted to shared util**: Moved `categoryConfig` from being duplicated in LatestReading and TimelineEntry into `src/lib/ui/category-config.ts`. Both components now import from there. Future components should do the same.
- **ESC/ESH 2018 categories**: Replaced AHA 5-category system (Normal/Elevated/Stage 1/Stage 2/Crisis) with ESC/ESH 7-category system (Optimal/Normal/High Normal/Grade 1/Grade 2/Grade 3/Isolated Systolic). Enum values, labels, and Tailwind color classes all updated.
- **ReadingGroup pattern**: API now returns `ReadingGroup<T>[]` instead of `HealthMetric<T>[]`. Each group has `readings` (individual), `average` (computed), `isGrouped` (boolean), and `timestamp`. All components updated to consume this shape.
- **Expand/collapse UI**: Used Tailwind `max-h` + `opacity` transitions for smooth expand/collapse. No animation library needed. `overflow-hidden` + `transition-all duration-300` handles it cleanly.
- **Turk's service already had ReadingGroup**: When I started this task, `health-data-service.ts` already had `groupReadings()` and `buildReadingGroup()` with the `ReadingGroup` type and `groupCount` on `MetricSummary`. Types aligned on first build — zero drift.
- **Test updates**: All 65 tests updated and passing. Classification tests rewritten for ESC/ESH thresholds. Mock data in hook/API/service tests updated to use `ReadingGroup` shape.

## Cross-Team Collaboration (2026-04-06 MVE Build)

**Turk (Backend):** All types matched exactly on first build. Your `MetricSummary` structure with `median` in stats is correct. Components render cleanly with zero TypeScript drift.

**Carla (Tester):** 72 tests passing against your components. No rendering issues found in jsdom environment. One data quality flag in classification (zero/negative values) — defer to Phase 2.

## Completed Work (2026-04-06 18:17)

**Session:** ESC/ESH 2018 Classification + Multi-Reading Grouping  
**Task:** Expandable combined reading UI + ESC category badges  
**Outcome:** ✅ SUCCESS

**Code Implementation:**
- Created `src/lib/ui/category-config.ts` — Shared category config (7 ESC categories + Tailwind colors)
- ESC/ESH category badge colors: green → yellow → orange → red progression (plus purple for ISH)
- Expand/collapse pattern: ×N badges for grouped readings, smooth CSS max-h transitions
- ReadingGroup<T>[] data shape integration across all components:
  - `LatestReading.tsx` — "Show readings" link + expand/collapse
  - `TimelineEntry.tsx` — ×N badge + expand/collapse
  - `SummaryCard.tsx` — Group count display with subtitle
  - `Timeline.tsx`, `useHealthData.ts`, `page.tsx` — ReadingGroup integration
- Summary Card now shows groupCount (reading sessions) as primary metric

**Files Modified:**
- `src/lib/ui/category-config.ts` — New shared category config
- `src/components/LatestReading.tsx`, `TimelineEntry.tsx`, `SummaryCard.tsx`, `Timeline.tsx`
- `src/hooks/useHealthData.ts`, `src/app/page.tsx`
- All 5 test suites updated (65 tests passing)

**Build & Tests:** ✅ TypeScript clean, 65 tests passing

**API Contract Update:** All components updated to consume ReadingGroup[] instead of HealthMetric[]

**Orchestration log:** `.squad/orchestration-log/2026-04-06T18-17-elliot.md`

## Ready for Phase 2

Timeline component accepts optional date range filter for future coaching agent time slices and doctor view date ranges. No changes needed; feature is additive.

### 2025-07-15 — 5 Visualization Features (Connected Dot Timeline + ESC Zones + Day Summaries + Sparklines + Range Bars)

- **Connected dot timeline works**: Vertical `w-0.5 bg-gray-300` line with tier 1 (day) dots `w-4 h-4` colored by worst ESC category, tier 2 (individual reading) dots `w-2.5 h-2.5` indented with horizontal stubs. Expand/collapse preserved via `max-h` + `opacity` transitions.
- **category-config.ts extended**: Added `dotColor`, `zoneBg`, `barColor`, and `severity` fields. Added `worstCategory()` helper and `zoneLegendCategories` ordered list. Existing `classes` and `label` fields unchanged — no breaking changes to LatestReading or SummaryCard.
- **Pure SVG sparklines**: `<polyline>` approach with viewBox 0 0 100 40 works well. Two lines (systolic primary, diastolic lighter). Only renders for 3+ readings — important clinical gate from Kelso.
- **RangeBar fixed scale**: 80–200 mmHg scale. `left` and `width` percentages calculated from min/max systolic values. Simple and effective.
- **CategoryDistribution stacked bar**: Uses flex with percentage widths. Segments sorted by severity so colors read left-to-right from healthiest to worst.
- **ZoneLegend is compact**: `flex-wrap` handles mobile nicely — wraps to 2 lines on small screens.
- **DaySummary card combines everything**: Distribution bar + range bar on one row, range text + count on another row, sparkline in the header. Zone background via `config.zoneBg` keeps it subtle.
- **Accessibility**: `aria-label` on all interactive elements (DaySummary, TimelineEntry), keyboard navigation with Enter/Space, `role="img"` on SVG elements.
- **No new dependencies**: Zero npm installs. All pure Tailwind + inline SVG as planned.

## Completed Work (2025-07-15 — Visualization Features)

**Session:** 5 Visualization Features Build  
**Task:** Connected Dot Timeline, ESC Zone Bands, Day Summary Cards, Sparklines, Range Bars  
**Outcome:** ✅ SUCCESS — Build passes, all 65 tests pass

**New Components Created:**
- `src/components/Sparkline.tsx` — Inline SVG sparkline (systolic + diastolic polylines)
- `src/components/RangeBar.tsx` — Horizontal range bar (80–200 mmHg fixed scale)
- `src/components/CategoryDistribution.tsx` — Stacked mini-bar showing category percentages
- `src/components/ZoneLegend.tsx` — Compact ESC zone color legend
- `src/components/DaySummary.tsx` — Tier 1 day dot with summary card (all features combined)

**Components Updated:**
- `src/components/Timeline.tsx` — Connected dot timeline with vertical line + ZoneLegend
- `src/components/TimelineEntry.tsx` — Now serves as tier 2 reading display with improved accessibility
- `src/lib/ui/category-config.ts` — Extended with dotColor, zoneBg, barColor, severity, worstCategory(), zoneLegendCategories

**Build & Tests:** ✅ TypeScript clean, 65 tests passing, zero new dependencies

## Visualization Implementation (2026-04-06 19:25)

**Session:** Visualization Upgrade — Implementation Phase  
**Task:** Build 5 visualization features per Cox's prioritized plan  
**Outcome:** ✅ SUCCESS

**Features Delivered:**

1. **Connected Dot Timeline (Tier 1 + 2 dots)**
   - Each day as single dot colored by worst ESC category
   - Expandable to show individual reading dots with connecting lines
   - Clinical value: 4-week risk trajectory at a glance

2. **ESC Color-Coded Zone Bands**
   - Background bands on timeline for all ESC categories (Optimal → Grade 3)
   - Visual risk stratification without reading numbers
   - Implemented as SVG `<rect>` elements

3. **Day Summary Cards**
   - Category distribution (stacked bar showing zone frequency)
   - Systolic/diastolic range with reading count
   - Replaces numeric averages with zone frequency data

4. **Sparklines**
   - Inline SVG line charts for intra-day trends
   - Rendered only when day has 3+ readings (Kelso clinical gate)
   - ~30 lines per component

5. **Range Bars**
   - Vertical bars showing min-to-max spread per day
   - Fixed 80–200 mmHg scale for consistent visual comparison
   - Always paired with reading count

**Files Created:**
- `src/components/Timeline/DaySummary.tsx` — Composite orchestrator
- `src/components/Timeline/Sparkline.tsx` — Sparkline with 3+ gate
- `src/components/Timeline/RangeBar.tsx` — Fixed-scale range visualization
- `src/components/Timeline/CategoryDistribution.tsx` — Stacked bar
- `src/components/Timeline/ZoneLegend.tsx` — ESC color legend

**Files Modified:**
- `src/components/Timeline/Timeline.tsx` — Zone bands + legend
- `src/components/Timeline/TimelineEntry.tsx` — Worst-category coloring
- `src/app/page.tsx` — Integration point
- `src/config/category-config.ts` — Extended CategoryStyle interface

**Build & Tests:** ✅ TypeScript clean, 65 tests passing, zero new dependencies added

**Key Implementation Decisions:**
- Extended category-config.ts (single source of truth)
- DaySummary as composite orchestrator (feature separation + UX coordination)
- Sparkline 3+ gate enforced in component (clinical safety)
- Worst-category coloring for multi-reading days (safety signal)
- Fixed range bar scale 80–200 mmHg (visual consistency)
- ZoneLegend in Timeline header (contextual co-location)

**Tech Stack:** Pure Tailwind CSS + hand-rolled inline SVG, zero dependencies

**Orchestration log:** `.squad/orchestration-log/2026-04-06T19-25-elliot-viz-implementation.md`  
**Decision document:** Merged into `.squad/decisions.md` (Visualization Decisions section, Decisions 1–8)

### 2025-07-15 — Condensed Timeline View (Default)

- **Condensed row pattern**: Each day is one compact line: dot + date + distribution bar + dominant category badge + (n=X) count + chevron. Uses flexbox with `flex-wrap` for mobile. Clicking anywhere toggles the full expanded card.
- **State lifted to Timeline**: Expanded state moved from `DaySummary` (local `useState`) to `Timeline` (parent `Set<string>`). This enables auto-expand logic — days with Grade 2+, Grade 3, or ISH readings start expanded per Kelso's clinical safety rule.
- **New helpers in category-config.ts**: Added `dominantCategory()` (most frequent category, severity tiebreak), `hasHighRiskCategory()` (checks for Grade 2+/Grade 3/ISH). Both pure functions, easily testable.
- **Low-confidence fade**: Days with fewer than 3 reading groups get `opacity-70` on the condensed row — visual signal that the day's data is thin.
- **30-day default**: Updated `page.tsx` from `days: 7` → `days: 30`, header subtitle from "Last 7 days" to "Last 30 days". The condensed view makes 30 days scannable.
- **Skeleton updated**: Loading skeleton now matches the condensed row shape (single line) instead of the old full-card skeleton.
- **Smooth transitions preserved**: Expanded card uses `max-h` + `opacity` + `transition-all duration-200` — same pattern as before, just applied to the expanded card section below the condensed row.

### 2025-07-15 — Timeline CSS/Alignment Fixes

- **Flex-col dot column pattern**: Replaced single absolute-positioned vertical line with per-entry flex-col dot columns (`self-stretch flex flex-col items-center`). `flex-1` spacers above/below the dot auto-center the dot vertically on the summary card. First entry omits top line, last entry omits bottom line — line naturally starts/ends at dot centers.
- **Per-entry line segments + connectors**: Removed `space-y-4` gap class. Instead, explicit `h-4 w-0.5 bg-gray-300` connector divs between entries bridge the gap. Line position uses `ml-[11px]` (center of 24px column minus half of 2px line) for pixel-perfect alignment.
- **z-index layering for sticky headers**: Header `z-10` was same as dot `z-10`, causing bleed-through on scroll. Bumped header to `z-50`. Dots stay at `z-10`.
- **Tier-2 dot centering**: Changed `items-start` → `items-center` on tier-2 flex rows, removed manual `pt-1.5` on dot container. Horizontal stubs use `top-1/2 -translate-y-1/2` instead of fixed `top-[14px]`.
- **Tier-2 vertical line continuation**: Added absolute-positioned vertical line through the tier-2 expanded area at `left-[11px]` to keep stubs connected.

### 2025-07-15 — Condensed Timeline 4-Fix Batch

- **All-collapsed default**: Removed `computeAutoExpanded()` and `hasHighRiskCategory` import from Timeline.tsx. Initial state is `new Set()` — all days start collapsed. Clinical safety preserved via warning icon instead.
- **Warning icon pattern**: Days with Grade 2+, Grade 3, or ISH readings get a red `!` circle (`w-5 h-5 rounded-full bg-red-100 text-red-600`) on the condensed row. Uses existing `hasHighRiskCategory()` helper — now imported in DaySummary instead of Timeline.
- **Single-card expand pattern**: The old layout had condensed row as one element and expanded card as a separate `ml-6 mt-1 mb-2` panel — creating a visual break and timeline gaps. New approach: dot column is a sibling of the card container (`flex gap-3`), and the card wraps both the condensed header and expanded detail inside one `rounded-lg border` div. No margin, no gap — the card just grows.
- **Margin-to-padding for timeline gaps**: Replaced `mt-1 mb-2` (margin) on expanded section with `pt-0 pb-3` (padding). Padding is inside the card container, so the dot column's `self-stretch` covers it — no timeline gaps.
- **Tier-2 horizontal stubs**: Added `absolute left-0 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-gray-300` stubs connecting each tier-2 dot to the left edge of the readings area. Dots get `relative z-10` so they layer above the stub.

### 2025-07-16 — Condensed Timeline 5-Fix Refinement Batch

- **Warning icon moved right**: Warning `!` icon was inline after day label, misaligning distribution bars. Moved it to after the dominant category badge (before chevron), keeping all bars vertically aligned across days.
- **Removed "(n=X)" text — tick marks instead**: Replaced `(n={groupCount})` text with tick marks inside `CategoryDistribution`. Each segment now renders `flex` children with `border-r border-white/50` dividers between individual readings. Visually communicates count without text clutter.
- **Combined SYS/DIA into single range bar**: Removed separate SYS and DIA rows with labels. Now one `h-1.5 bg-gray-100 rounded-full` track with sky-400 (diastolic) and rose-400 (systolic) ranges overlaid. Tick marks directly below (no spacer needed since labels removed). Much more compact.
- **Removed duplicate summary in expanded section**: The old expanded card repeated distribution bar, range label, count label, and stats row — all already visible in the condensed header. Now expanded section only shows: range bar + tier-2 individual reading entries with dots.
- **Tier-2 vertical timeline line fix**: Added `absolute left-[9px] top-0 bottom-0 w-0.5 bg-gray-300` continuous line through the tier-2 readings area, ensuring no gaps between entries. Horizontal stubs connect from this line to each reading dot.
- **Dead code cleanup**: Removed `totalReadings`, `averagedCount`, `countLabel`, `rangeLabel` variables that were only used in the now-removed duplicate summary section.

### 2025-07-16 — Tier-2 Timeline Disconnect Fix (Deep Investigation)

- **ROOT CAUSE**: The tier-2 (individual reading) section was rendered INSIDE the summary card, which is the RIGHT sibling of the dot column in a `flex gap-3` layout. To visually connect tier-2 dots, a SECOND vertical line (`absolute left-[9px] top-0 bottom-0 w-0.5 bg-gray-300`) was placed inside the card. This 2nd line was at a completely different horizontal position from the main timeline line (which lives in the dot column on the LEFT side), creating the "2nd vertical line" artifact when a day was expanded.
- **STRUCTURAL FIX**: Moved tier-2 readings OUT of the card entirely. Each tier-2 entry is now its own flex row with a `w-6` dot column (same width as tier-1), placing tier-2 dots on the EXACT same vertical line as tier-1 dots. Horizontal stubs (`w-3 h-0.5 bg-gray-300`) bridge from the dot column to the reading content, replacing the gap that `flex gap-3` provides for tier-1 rows.
- **KEY LESSON**: Never put timeline elements (vertical lines, dots, stubs) inside a card that is a SIBLING of the dot column. Timeline elements must always be in the dot column itself to stay on the same vertical axis. The card is for content only.
- **Layout math**: Dot column is `w-6` (24px), `items-center` positions the `w-0.5` (2px) line at `left: 11px`. This matches the inter-day connector at `ml-[11px]`. Tier-2 stubs (`w-3` = 12px) replace the `gap-3` (12px) from tier-1 rows, so content starts at the same 36px horizontal position.
- **Expand/collapse preserved**: Range bar stays inside the card (day-level summary). Tier-2 section uses its own `max-h` + `opacity` transition wrapper outside the card.

### 2025-07-16 — 3 UI Optimizations Batch

- **Tick marks made more visible**: Replaced `border-r border-white/50` (1px, semi-transparent) with explicit `w-[2px] bg-white` divider elements using `Fragment` pattern. Now clearly visible against colored segments — easy to count readings per day at a glance.
- **Card frame removed from DaySummary**: Removed `rounded-lg border border-gray-100 transition-colors duration-200 hover:border-gray-200` from the day content wrapper. Replaced with `py-0.5` for spacing. The outer Timeline component already provides its own card (`rounded-2xl bg-white shadow-sm border`), so individual day cards were redundant and interfered with tier-2 dot connections.
- **Hover tooltips on bar segments**: Added `group/seg` + absolute-positioned tooltip to each CategoryDistribution segment. Shows category name, reading count, and BP values (sys/dia for each reading, "Avg: X/Y (×N)" for grouped). Uses `opacity-0 group-hover/seg:opacity-100 transition-opacity` — zero dependencies. Required passing `readings?: BloodPressureGroup[]` prop from DaySummary so the component has access to actual BP data per segment.
- **Key pattern**: Tailwind's `group/{name}` modifier enables nested hover targets — essential when the bar is inside a larger clickable area that also uses `group`.

### 2025-07-16 — 24-Hour Timeline Bar (Replaced CategoryDistribution)

- **CategoryDistribution → TimelineBar**: Completely reworked the day summary bar from category-proportion segments to a 24-hour timeline. Each reading group is now positioned by its actual timestamp (`minutesOfDay / 1440 * 100` = left %), not by category share. Gray background (`bg-gray-200`) represents times with no data.
- **Tooltip fix**: Old tooltips didn't show because the bar container had `overflow-hidden` (needed for `rounded-full`). New component uses `overflow-visible` on the bar container plus React state (`onMouseEnter`/`onMouseLeave`) for conditional tooltip rendering instead of CSS-only `group-hover` — more reliable, especially inside nested clickable areas.
- **Segment positioning algorithm**: `buildSegments()` sorts readings by time, calculates `leftPct` from minutes-of-day, and `widthPct` as `max(MIN_WIDTH_PCT=3%, group span)`. Clamps width to avoid overlapping the next segment (leaves 0.3% gap). Tick marks within grouped segments use flex + absolute `w-[2px] bg-white` dividers.
- **Tooltip content**: Shows time, BP values (with "Avg of N:" prefix for grouped), pulse, and ESC category label. Uses `z-50` for visibility above all other elements.
- **Files**: Created `src/components/TimelineBar.tsx`, updated `src/components/DaySummary.tsx` import, deleted `src/components/CategoryDistribution.tsx`.
- **Build & Tests**: ✅ TypeScript clean, 65 tests passing, zero new dependencies.

### 2025-07-16 — Midpoint-Split (Voronoi) TimelineBar Coloring

- **Replaced positioned-segment approach with midpoint-split**: Old algorithm placed each reading as a small colored segment at its timestamp position with gray (`bg-gray-200`) background for gaps. New algorithm fills the ENTIRE bar — each reading "owns" the time from the midpoint with its previous neighbor to the midpoint with its next neighbor. No gray segments remain.
- **First/last reading extension**: First reading extends backward to midnight (00:00), last reading extends forward to end of day (23:59). This makes single-reading days fully colored instead of a tiny dot on gray.
- **Tick marks as honesty signal**: Thin white vertical lines (`w-[2px] bg-white`) rendered at each reading's exact timestamp position using absolute positioning. These overlay the colored segments and show users where actual measurements happened vs. extrapolated color. Rendered with `pointer-events-none` so they don't interfere with segment hover.
- **Simplified segment algorithm**: Removed `MIN_WIDTH_PCT`, gap calculations, and overlap clamping. Midpoint math naturally produces non-overlapping, contiguous segments that tile the full 0–100% range.
- **Rounded corners per-segment**: First segment gets `rounded-l-full`, last gets `rounded-r-full`, single reading gets `rounded-full`. Middle segments have no rounding — they abut cleanly.
- **Tooltips preserved**: Same hover tooltip pattern (React `useState` for `hoveredId`) with BP values, time, pulse, and ESC category label.

### 2025-07-18 — TimelineBar Gap & Tooltip Fixes

- **Subpixel gap elimination**: Added 0.15% width overlap to every non-last segment. Browsers round percentage-based widths to device pixels differently, leaving hairline white lines between absolutely-positioned segments. The tiny overlap ensures adjacent segments always touch, with later segments rendering on top via DOM order. Last segment keeps its exact width to avoid overflowing the bar.
- **Tooltip arrow aligned to dot marker**: Tooltip was centered on the segment (`left-1/2 -translate-x-1/2`), but the dot marker sits at the reading's actual timestamp position within the segment. Computed `dotRelativePct` — the tick position relative to the segment's left edge — and used that as the tooltip's `left` style. The arrow `<div>` inside still uses `left-1/2 -translate-x-1/2` relative to the tooltip box, so the arrow always points straight down at the dot.

### 2025-07-18 — Dual-Bar CSS Grid Layout

- **Flex → CSS Grid for collapsed row**: Replaced `flex items-center gap-3 flex-wrap` with a 6-column CSS Grid (`grid-cols-[100px_minmax(60px,140px)_minmax(60px,1fr)_110px_20px_auto]`). Columns: day label, TimelineBar, RangeBar, badge, warning icon slot, chevron. Grid ensures all columns align perfectly across days — no flex wrapping issues.
- **Responsive grid template**: Mobile uses 5-column grid (no RangeBar column) via `grid-cols-[100px_minmax(60px,1fr)_110px_20px_auto]`. Desktop (md+) adds the RangeBar column. The RangeBar `<div>` itself uses `hidden md:block` — CSS Grid skips `display:none` items, so remaining items flow into the 5 mobile columns naturally.
- **RangeBar `compact` prop**: Added boolean prop. `compact=true`: `h-2` bar height (matches TimelineBar), no tick labels below. `compact=false` (default): original `h-1.5` with tick labels. Expanded section keeps the full RangeBar with tick labels for detail.
- **Warning icon slot always reserved**: Changed from conditional rendering (`{isHighRisk && <span>}`) to always-rendered `<div>` wrapper with conditional content. The 20px grid column is always present, preventing layout shift when warning appears/disappears.
- **Container widened**: `max-w-3xl` → `max-w-4xl` in both header and main content areas of `page.tsx`. Provides breathing room for the dual-bar layout.
- **Build & Tests**: ✅ TypeScript clean, 65 tests passing, zero new dependencies.

### 2025-07-23 — Scale, Gap, Alignment & Warning Icon Polish (5 items)

- **RangeBar scale widened to 60–200 mmHg**: Changed `SCALE_MIN` default from 80 to 60, updated `TICK_VALUES` to `[60, 120, 140, 160, 200]`. Scale now spans 140 units instead of 120, giving more room for lower diastolic readings.
- **Sticky header scale updated**: "80 mmHg" → "60 mmHg", tick positions recalculated (120 at 42.86%, 140 at 57.14%) to match the new 60–200 range.
- **Doubled gap between timeline and range bars**: `gap-x-5` → `gap-x-10` in both the DaySummary grid and the Timeline sticky scale header grid. Keeps the two bar columns visually distinct.
- **Right-aligned "24h" and "200" labels**: Added explicit `text-right` to both right-edge scale labels in the sticky header for guaranteed right-edge alignment with the bars below.
- **Warning icon moved to LEFT of tier-1 dot**: Added a dedicated `w-5` warning column before the dot column in the tier-1 flex layout. For Grade 2+ days: `[⚠️] [dot] [date]`. For normal days the column renders empty, reserving space so all dots stay vertically aligned. Tier-2 expanded rows get a matching `w-8` spacer (w-5 + gap-3 = 32px) to keep their dots on the same vertical line. Inter-day connector updated from `ml-[11px]` to `ml-[43px]` to center on the shifted dot position. Sticky header also received a matching `w-5` spacer.

## Learnings

### 2026-04-16 — Chat UI Library Research & Recommendation

**Context:** Jan requested investigation of chat UI libraries for the right-side chat panel (VS Code-like split layout). Must support streaming AI responses (token-by-token rendering like ChatGPT), React 19, Tailwind CSS 4, split-pane layout.

**Libraries Evaluated:**
1. **Vercel AI SDK (`ai` + `@ai-sdk/react`)** — Provider-agnostic toolkit with streaming support via `useChat` hook. ~25 kB gzipped. React 19 native. Minimal dependencies.
2. **@chatscope/chat-ui-kit-react** — Dedicated chat UI kit. No streaming, React 19 untested, FontAwesome dependency adds ~40–60 kB. Last update 9 months ago.
3. **react-chat-elements** — Lightweight but too minimal. No streaming, no markdown rendering, small community.
4. **Stream Chat React** — Enterprise chat platform (overkill for single-user AI chat). ~100+ kB. Paid at scale.
5. **Build Custom** — `react-markdown` + custom state management. Full control but 2–3 week dev time for production-grade streaming/UX.

**Split-Pane Solution:**
- **react-resizable-panels** — Best option. Simple API, Tailwind-friendly, ~8 kB, keyboard accessible, battle-tested.
- CSS-only alternatives possible but less refined.

**Key Insights:**
- **Streaming is non-negotiable.** UI kits like @chatscope are great for static chat, but we need token-by-token updates. Vercel AI SDK abstracts this beautifully on the client side via `useChat`.
- **React 19 support matters.** Many libraries don't explicitly test against React 19. Vercel AI SDK is designed for it (Server Components, Suspense patterns).
- **Bundle size trade-off:** Vercel AI SDK (~25 kB) + markdown libraries (~15 kB) + split-pane (~8 kB) = ~50 kB total new impact. Acceptable for production AI chat.
- **TypeScript ecosystem:** Vercel AI SDK and shadcn/ui are TypeScript-first and well-documented. No prop-types or type assertion gymnastics needed.

**Recommendation:** **Vercel AI SDK + shadcn/ui Chat Components + react-resizable-panels**
- Streaming out-of-the-box (`useChat` hook handles SSE + state)
- React 19 native (designed for App Router + Server Components)
- Tailwind-first (shadcn/ui uses pure Tailwind, zero CSS framework)
- Minimal bundle overhead
- Active maintenance (Vercel backing)
- Production-proven by many AI startups

**Decision Document:** `.squad/decisions/inbox/elliot-chat-ui-libraries.md` — Contains full comparison table, pros/cons per library, example code, and next steps.

**Tech Stack (Approved by Elliot):**
- `ai` — Server-side streaming + provider abstraction
- `@ai-sdk/react` — `useChat` hook for client state
- `shadcn/ui` — Copy-paste Tailwind components (Chat, Message, Input)
- `react-markdown` + `remark-gfm` + `rehype-highlight` — Markdown + code blocks
- `react-resizable-panels` — Split-pane layout (Timeline left, Chat right)
- `lucide-react` or `react-icons` — Icons (optional)

**Estimated Implementation Time:** 3–5 days (API route + component integration).
**Maintenance Burden:** Low (all libraries actively maintained, well-documented).


## 2026-04-08 — Chatbot Architecture Alignment

**Session:** UI Library Research & Chat UI Architecture (Cox, Elliot, JD, Turk)  
**Output:** `.squad/decisions/inbox/elliot-chat-ui-libraries.md`

### Research Summary

Evaluated 5 chat UI solutions:

1. **Vercel AI SDK + shadcn/ui** ✅ Recommended
   - Native streaming, React 19 native, Tailwind-first
   - ~25 kB bundle (SDK only)
   - Active maintenance, production-proven

2. **@chatscope/chat-ui-kit-react** — Rejected
   - No streaming support (blocker)
   - React 19 untested, Tailwind friction

3. **react-chat-elements** — Rejected
   - Too minimal, no streaming, small community

4. **Build custom** — Rejected
   - 2–3 weeks dev time, redundant

5. **Stream Chat React** — Rejected
   - Overkill for single-user AI chat

### UI Stack Decision

```
- ai + @ai-sdk/react (streaming hooks)
- shadcn/ui (chat components, Tailwind)
- react-markdown + remark-gfm + rehype-highlight (rendering)
- react-resizable-panels (split pane, ~8 kB)
```

### Split-Pane: react-resizable-panels

- Simple API: `<PanelGroup>`, `<Panel>`, `<PanelResizeHandle>`
- Tailwind-friendly, ~8 kB gzipped
- Accessible (keyboard + ARIA)
- Battle-tested

### Timeline

- Copy shadcn/ui chat components (~1 day)
- Integrate split pane with Timeline + Chat (~2–3 days)
- Polish, theming, responsive (~2–3 days)

### Status

✅ Tech stack recommended and locked. Ready for Week 2 implementation.
