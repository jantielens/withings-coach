# Decision: "Less Is More" — Timeline Row Simplification

**From:** Elliot (Frontend Developer)
**Date:** 2025-07-22
**Status:** ✅ Implemented

## Context

The collapsed day summary row had 6 grid columns on desktop (date, timeline bar, range bar, badge label, warning icon, chevron). The badge text ("Grade 1", "High Normal") duplicated information already encoded by:
- Tier-1 dot color (worst category)
- TimelineBar segment colors (per-reading categories)
- ZoneLegend at the top of the timeline card

The separate warning icon column added 20px of reserved space on every row, even safe days.

## Decision

**1. Remove badge text column.** Severity is visually encoded three ways already — a fourth (text) adds clutter without information gain.

**2. Merge warning into dot.** Grade 2+ days get a slightly larger dot (`w-5 h-5`) with a red ring (`ring-offset-1 ring-red-300`) instead of a separate icon. One visual element instead of two.

**3. Add sticky scale header.** A thin ruler row (`0h / 12h / 24h` and `80 / 120 / 140 / 200`) at the top of the timeline card gives context for both bars without per-row labels.

## Result

- Desktop grid: 6 → 4 columns (date, timeline bar, range bar, chevron)
- Mobile grid: 4 → 3 columns (date, timeline bar, chevron)
- Both bars now `1fr` — equal width, filling available space
- Rich `aria-label` on dots preserves screen reader accessibility
- Native `title` tooltip on dots preserved for mouse hover

## Trade-offs

- Users lose at-a-glance text labels — must rely on color encoding + ZoneLegend
- High-risk signal is subtler (ring vs. explicit "!" icon) — mitigated by dot size increase
- Scale header adds one row of UI but removes need for mental mapping

## Files Changed

- `src/components/DaySummary.tsx` — removed badge + warning columns, simplified grid, enhanced dot
- `src/components/Timeline.tsx` — added sticky scale header row
