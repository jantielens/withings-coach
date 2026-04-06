# Turk — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Integrate with Withings API to pull health data (blood pressure, heart rate, ECG) and serve it to three consumers: web timeline, LLM agent, doctor view
- **Key concern:** Reliable Withings OAuth flow, data normalization, and efficient API design for multiple consumers

## Clinical Input from Kelso

**Blood Pressure Classification (2026-04-06):**
- BP classification uses **higher-of-two-categories** rule: when systolic and diastolic fall into different severity levels, assign the higher one
- Example: Reading 128/82 → Systolic=Elevated, Diastolic=Stage 1 → **Assigned: Stage 1**
- This rule prevents underestimating cardiovascular risk; implement in service layer classification logic

## Learnings

**2025-07-16 — MVE Backend Build:**
- Initialized Next.js 16 (App Router, TypeScript, Tailwind, src dir) in repo root. Had to scaffold in a temp dir and copy files because create-next-app rejects directories with existing files.
- Built full backend: types → auth → adapters → classification → services → registry → API routes → config.
- Withings API `getmeas` uses POST with `application/x-www-form-urlencoded`. Measure values need `value * 10^unit` conversion. BP measures are grouped by `grpid` with meastype 9=diastolic, 10=systolic, 11=pulse.
- BP classification implements higher-of-two-categories rule per Kelso's binding decision. Diastolic alone can't produce ELEVATED (that requires systolic 120-129 AND diastolic <80).
- Summary stats include avg, median, min, max per Decision 5 from Kelso. Pulse stats are omitted when all pulse values are zero (incomplete readings).
- `npm run build` passes cleanly — all routes compile, types check out.

## Cross-Team Collaboration (2026-04-06 MVE Build)

**Elliot (Frontend):** Types aligned successfully; confirmed `timestamp` is `string` (ISO 8601). Frontend components integrate with your `MetricSummary` and `HealthReading` types without changes.

**Carla (Tester):** All 72 tests passing. Flagged one data quality issue: `classifyBloodPressure(0, 0)` returns "normal". Recommendation: add physiological bounds check (systolic ≥ 40, diastolic ≥ 20) in Phase 2. Not blocking MVE.

## Open Questions for Turk

- Cox has 2 open questions about Withings API:
  - What are the rate limits on Withings API calls? (per endpoint, per user, per day?)
  - What is the token refresh behavior for OAuth? Do access tokens expire? How long is the refresh token valid?
  - **Dependency:** Cox is deferring caching decision (Decision 5) pending rate limit investigation

## Phase 2 Backlog

- Add input validation guard to `classifyBloodPressure()` per Carla's discovery (physiological bounds: systolic ≥ 40, diastolic ≥ 20)
- Pending Kelso validation of clinical lower bounds

