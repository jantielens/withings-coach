# Decision: Dual-Bar CSS Grid Layout for Collapsed Day Summary

**Author:** Elliot (Frontend Developer)  
**Date:** 2025-07-18  
**Status:** Implemented  
**Context:** Cox recommended adding a compact RangeBar alongside the TimelineBar in the collapsed day row for at-a-glance SYS/DIA spread visibility.

## What Changed

### 1. Collapsed Row: Flex → CSS Grid
Replaced flexbox layout with a 6-column CSS Grid:
```
grid-cols-[100px_minmax(60px,140px)_minmax(60px,1fr)_110px_20px_auto]
```
Columns: day label | TimelineBar | RangeBar | badge | warning icon | chevron

### 2. RangeBar `compact` Prop
- `compact={true}`: `h-2` height (matches TimelineBar), no tick labels
- `compact={false}` (default): original `h-1.5` with tick labels (used in expanded section)

### 3. Mobile Responsiveness
- Mobile (<md): 5-column grid, RangeBar hidden via `hidden md:block`
- Desktop (md+): full 6-column grid with both bars visible

### 4. Layout Stability
- Warning icon column (20px) always reserved — no layout shift
- Badge column fixed at 110px — handles "Isolated Systolic" text

### 5. Container Width
- `max-w-3xl` → `max-w-4xl` for both header and main content

## Files Modified
- `src/components/RangeBar.tsx` — Added `compact` prop
- `src/components/DaySummary.tsx` — Flex → CSS Grid, added compact RangeBar
- `src/app/page.tsx` — Widened container

## Build & Tests
✅ TypeScript clean, 65 tests passing, zero new dependencies
