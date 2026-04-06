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

