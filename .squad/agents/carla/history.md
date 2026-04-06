# Carla — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Ensure data integrity and quality across the full pipeline — Withings API data through to UI display and LLM consumption
- **Key concern:** Health data accuracy is critical. A wrong blood pressure reading or misrepresented trend could mislead users or doctors.

## Learnings

- **Jest + ts-jest + jsdom works with Next.js 16 / React 19**: No special config needed beyond `moduleNameMapper` for `@/` path aliases and separate projects for node vs jsdom environments.
- **`toHaveStyle` is unreliable in jsdom for inline React styles**: Use `element.style.propertyName` directly instead. This is a known pain point — the real component will likely use Tailwind classes anyway, making style testing moot.
- **BP classification has no input validation**: `classifyBloodPressure(0, 0)` returns "normal" and negative values don't throw. This is technically correct per the threshold math but clinically nonsensical. Flagged for Turk — consider adding a guard.
- **Proactive test pattern works**: Writing tests from PRD + decisions.md before implementation is done is viable. 72 tests pass against Turk's actual classification code and type definitions. Service/API/hook/component tests use stubs that document the expected contract — they'll need updates when implementation lands.
- **Crisis threshold is strict >180 / >120 (not ≥)**: 180/120 exactly classifies as Stage 2, not Crisis. Verified against Turk's implementation. This matches the decisions.md table ("Systolic >180" and "Diastolic >120").

## Cross-Team Collaboration (2026-04-06 MVE Build)

**Turk (Backend):** All 72 tests passed against your actual implementation on first run. BP classification matches Kelso's binding 2017 ACC/AHA thresholds exactly. Higher-of-two-categories rule verified in 8 edge case tests.

**Elliot (Frontend):** Components integrate cleanly with test suite. No rendering issues in jsdom. Tailwind styling validation working (bypassed `toHaveStyle` unreliability by checking `element.style` directly).

## Data Quality Flagged

- `classifyBloodPressure(0, 0)` returns "normal" — mathematically correct but clinically nonsensical
- Physiological bounds validation deferred to Phase 2 per decision (Turk + Kelso collaboration)
- MVE safe: Withings API won't send zeroes

## Ready for Phase 2

All user story contracts from PRD mapped to tests. Test suite documents expected API/service/hook/component behavior. Service/API tests use stubs that will integrate with actual implementations in Phase 2.

