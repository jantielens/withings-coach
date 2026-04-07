# Decision: Ideal BP Reference Markers on RangeBar

**From:** Elliot (Frontend Developer)
**Date:** 2025-07-24
**Status:** Implemented

## Context

Kelso's clinical guidance identifies 120/80 mmHg as the ideal (Optimal) BP threshold per ESC/ESH 2018. Users currently see their ranges on the bar but have no visual reference for where "ideal" sits on the scale.

## Decision

Add two subtle 1px vertical reference lines at 120 mmHg and 80 mmHg on every RangeBar instance. Lines are `bg-gray-400/40` — visible but not dominant. They render behind the colored systolic/diastolic segments.

## Rationale

- **Subtle > Bold**: The markers are reference lines, not alarms. Semi-transparent gray blends into the bar track without competing with the colored segments that represent actual readings.
- **Same math, guaranteed alignment**: Lines use the identical `((value - scaleMin) / scaleRange) * 100` formula as the bar segments, so they always align perfectly with the scale.
- **No tooltip on 1px lines**: Hover targets are too small to be reliable. The scale header labels and the ZoneLegend disclaimer text provide the same information more reliably.
- **Disclaimer in ZoneLegend**: "Target: 120/80 mmHg · Consult your doctor for personal goals" — keeps the clinical disclaimer co-located with the zone color legend where users are already looking for context.

## Scope

- `src/components/RangeBar.tsx` — Ideal marker lines + z-index layering
- `src/components/Timeline.tsx` — Matching markers + "80" label in sticky scale header
- `src/components/ZoneLegend.tsx` — Target disclaimer text

## Trade-offs

- Added "80" tick label to scale header — increases label density slightly but the spacing (14.29% from left edge) is sufficient to avoid overlap with "60 mmHg" at 0%.
- No hover tooltip on markers — traded interactivity for simplicity since the lines are 1px wide.
