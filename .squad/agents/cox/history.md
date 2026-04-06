# Cox — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Health data app (blood pressure, heart rate, ECG) with three output modes:
  1. Health timeline in the web app for users
  2. LLM coaching agent for feedback, trend detection, and Q&A
  3. Doctor-friendly data presentation
- **Key concern:** Clean architecture connecting Withings API → data layer → three distinct consumers (UI, LLM, doctor view)

## Learnings

### 2025-07-15 — MVE PRD Written

- **PRD interview process works.** Jan's answers were concrete enough to make binding architecture decisions. The "if it's easy, do it" pattern (re: OAuth) is a trap — always evaluate complexity before committing. OAuth with Withings is not easy; the abstraction is the right investment.
- **Jan's "future-proof" means: invest upfront in architecture.** He explicitly wants to avoid refactoring. This maps to adapter patterns, generic types, and interface-first design. Total cost: ~3 hours of extra abstraction. Payoff: new metric types and data sources are additive, not rewrite-worthy.
- **Metric-agnostic data model is the spine.** The `HealthMetric<T>` generic pattern is the single most important architecture decision. Every future feature (HR, ECG, LLM coaching, doctor view) depends on this being right. Don't let anyone special-case blood pressure in the service or API layers.
- **Clinical classification belongs in the service layer.** Three future consumers (UI, LLM, doctor view) all need BP category data. If it lives in UI components, we'll have to extract it later. Put it in the service layer from day one.
- **Keep the MVE ruthlessly scoped.** Blood pressure only, list view only, fetch-on-demand only, hardcoded token only. Every "just add this one thing" pulls us away from proving the data pipeline works end-to-end.
- **Open questions for Kelso are real blockers.** BP classification thresholds, disclaimer requirements, and pulse handling all affect the data model and UI. Get Kelso's input before Turk and Elliot start building.

### 2025-07-15 — Visualization Plan Synthesized

- **Clinical veto power works.** Kelso rejected three of Jan's original ideas (trend arrows, vertical line charts, standalone averages) with clear clinical reasoning. Letting the domain expert kill features early saved 3-4 hours of wasted UI work and avoided shipping something misleading.
- **Zero-dependency UI is the right call for this project.** Elliot confirmed every visualization we need is achievable with Tailwind + inline SVG. Charting libraries (D3, Chart.js, Recharts) add bundle weight, learning curve, and accessibility debt for features we won't use. This only works because our chart types are simple — revisit if we ever need interactive zooming or complex annotations.
- **Synthesizing specialist inputs requires active filtering, not just merging.** Kelso and Elliot independently converged on the same build order, which is a strong signal. Where they diverged (Elliot listed trend arrows as trivial to build; Kelso flagged them as clinically harmful), the clinical perspective correctly overrides the feasibility perspective. Easy-to-build ≠ should-build.
- **Category distribution > numeric averages for BP summaries.** This was Kelso's strongest recommendation and it aligns with ESC guidelines. Averages mask the thing doctors care about most: how often readings land in dangerous zones. This principle should carry forward to any future metric summaries (HR zones, etc.).

## Visualization Synthesis (2026-04-06 19:25)

**Session:** Visualization Upgrade — Team Synthesis  
**Task:** Synthesize Kelso clinical guidance + Elliot feasibility analysis into prioritized build plan  
**Outcome:** ✅ SUCCESS

**Synthesis Process:**
- Inputs: Kelso (clinical utility ranking), Elliot (feasibility assessment + effort estimates), Jan (original feature requests)
- Output: Prioritized 5-item build list with technical approach, effort estimates, and trade-off rationale

**Prioritized Build List:**
1. Connected Dot Timeline (Tier 1 day dots + Tier 2 reading dots) — 1–2 hours
2. ESC Color-Coded Zone Bands — ~1 hour
3. Day Summary Cards (Category Distribution + Range + Count) — 2–3 hours
4. Sparklines (3+ reading gate) — 1–2 hours
5. Range Bars — 1 hour
**Total:** 6–9 hours

**Technical Approach:** Pure Tailwind CSS + hand-rolled inline SVG, zero new dependencies

**Items Cut & Clinical Rationale:**
- **Daily trend arrows** — Kelso clinical veto (false reassurance from noisy day-over-day deltas)
- **Vertical line charts (sys/dia separate)** — Kelso clinical veto (reintroduces solved ambiguity)
- **Standalone daily averages** — Kelso veto (masks variability; replaced by category distribution + range)

**Default View:** 4-week timeline with connected dots (colored by worst ESC category), zone bands (background), expandable day cards (category distribution + range + count)

**Key Decisions Documented:**
- Worst-category coloring for multi-reading safety
- Category distribution as primary signal
- Fixed 80–200 mmHg range bar scale
- Sparkline 3+ reading threshold
- DaySummary as composite orchestrator
- ZoneLegend in Timeline header

**Orchestration log:** `.squad/orchestration-log/2026-04-06T19-25-cox-visualization-synthesis.md`  
**Decision document:** Merged into `.squad/decisions.md` (Visualization Decisions section)

