# Decision: Outlined Dot Markers for TimelineBar

**Date:** 2025-07-18
**Author:** Elliot (Frontend)
**Status:** Implemented

## Context

The TimelineBar used thin 2px white vertical lines as tick marks to show exact reading times. Jan evaluated three visual options and chose **Option 3: White Dot with Dark Border (Outlined Marker)**.

## Decision

Replaced tick lines with `w-1.5 h-1.5 rounded-full bg-white border border-gray-800` dots, centered vertically on the bar with `z-10` to layer above colored segments. `pointer-events-none` preserved so segment tooltips still fire through the dots.

## Rationale

- Dots are visually distinct from the colored bar without being as harsh as full-height vertical lines
- The dark border ensures visibility against both light and dark bar segment colors
- 6px size is small enough to avoid clutter with multiple readings, large enough to see

## Impact

- Pure CSS change — no logic, props, or data flow affected
- Build passes, no test changes needed
