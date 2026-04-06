# Decision: Condensed Timeline View as Default

**Author:** Elliot (Frontend Dev)  
**Date:** 2025-07-15  
**Status:** Implemented

## Context

With 30 days of data, the previous full-card-per-day layout was too verbose. Jan requested a condensed timeline where each day is a single scannable line, expandable on click.

## Decisions Made

### 1. Condensed row is the default, expanded card on click
Each day renders as one compact line: colored dot, short date, distribution bar, dominant category badge, reading count (n=X), and a ▼/▲ chevron. Clicking anywhere on the row toggles the full day card (range bars, individual readings, grouped readings).

### 2. Dot colored by worst category, badge shows dominant category
The timeline dot uses the worst ESC category color (safety signal — small visual alert). The text badge shows the most frequent category (data summary). This gives both "what's the worst case" and "what's typical" in one line.

### 3. Auto-expand high-risk days (clinical safety rule)
Days containing any Grade 2+, Grade 3, or Isolated Systolic Hypertension readings start expanded. Users can collapse them, but the default ensures dangerous readings are never hidden behind a condensed row. This is Kelso's clinical safety requirement.

### 4. Low-confidence fade for n<3 days
Days with fewer than 3 reading groups get 70% opacity. Visual signal that the day's data is thin and shouldn't be over-interpreted.

### 5. Multi-color distribution bar (not single color)
Per Jan's explicit preference: the stacked CategoryDistribution bar stays multi-color showing all categories, not a single worst-category color.

### 6. Expanded state lifted to Timeline parent
State management moved from DaySummary (local useState) to Timeline (parent Set<string>). Required for auto-expand logic and enables future features like "expand all" / "collapse all" controls.

### 7. 30-day default range
Updated from 7 to 30 days. The condensed view makes this scannable. Turk is updating the API default in parallel.

## Files Changed
- `src/lib/ui/category-config.ts` — Added `dominantCategory()`, `hasHighRiskCategory()`
- `src/components/DaySummary.tsx` — Condensed + expanded dual mode
- `src/components/Timeline.tsx` — Expanded state management, auto-expand logic
- `src/app/page.tsx` — 30-day default, updated subtitle
