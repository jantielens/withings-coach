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
