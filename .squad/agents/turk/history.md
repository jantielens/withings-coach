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

**2025-07-18 — ESC/ESH 2018 Classification + Multi-Reading Grouping:**
- Switched BP classification from AHA 2017 to ESC/ESH 2018 (European Society of Cardiology). New categories: Optimal, Normal, High Normal, Grade 1/2/3, Isolated Systolic Hypertension. Updated BPCategory enum, classification logic, and all downstream consumers.
- ISH is checked first (systolic ≥140 AND diastolic <90) — this is a separate clinical entity from Grades 1-3. Even systolic ≥180 with diastolic <90 is ISH, not Grade 3, because the grades assume both components are elevated.
- Implemented `groupReadings()` in the service layer to detect multi-reading sessions (readings within 10 minutes → one group). Average of group becomes primary display value; classification applied to the average, not individual readings.
- `MetricsResponse` now returns `ReadingGroup<T>[]` instead of `HealthMetric<T>[]`. Summary stats (`MetricSummary`) now include `groupCount` alongside `count` (total individual readings).
- Key design choice: summary stats use averaged values from each group, not individual readings. This prevents triple-counting a 3-reading session.

**2025-07-17 — Withings API meastype Bug Fix:**
- The `meastype` (singular) parameter in the Withings Measure API filters individual measures within each group, NOT which groups are returned. Using `meastype=10` caused only systolic measures to appear in each group — diastolic and pulse were stripped out. The adapter then skipped every reading because diastolicMeas was always undefined.
- Fix: Changed to `meastypes` (plural, comma-separated) with `9,10,11` to request all three BP-related types. This ensures the full measure group is returned with systolic, diastolic, and pulse intact.
- Added `[Withings]`-prefixed debug logging to the adapter: request params, HTTP status, API status, group count, and parsed readings count. This will make future API issues visible in server output immediately.

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

## Completed Work (2026-04-06 18:17)

**Session:** ESC/ESH 2018 Classification + Multi-Reading Grouping  
**Task:** Implement ESC classification + multi-reading detection/grouping  
**Outcome:** ✅ SUCCESS

**Code Implementation:**
- BPCategory enum updated: 7 categories (OPTIMAL, NORMAL, HIGH_NORMAL, GRADE_1, GRADE_2, GRADE_3, ISOLATED_SYSTOLIC)
- Classification logic: ESC/ESH 2018 thresholds, ISH check-first priority
- ReadingGroup<T> generic type with grouping algorithm (10-min window)
- Averaging: mean of systolic, diastolic, pulse (rounded to integers)
- Classification applied to averaged values, not individual readings
- MetricSummary updated with groupCount field

**Files Modified:**
- `src/lib/types/metrics.ts` — ReadingGroup<T>, BPCategory enum, groupCount
- `src/lib/classification/blood-pressure.ts` — ESC/ESH 2018 thresholds, ISH logic
- `src/lib/services/health-data-service.ts` — Multi-reading grouping and averaging
- `src/app/api/health/metrics/route.ts` — API response shape (ReadingGroup[])
- All unit tests updated and passing (65 tests)

**Build & Tests:** ✅ TypeScript clean, 65 tests passing

**API Contract Change:** Breaking change from HealthMetric[] to ReadingGroup[] (coordinated with Elliot)

**Orchestration log:** `.squad/orchestration-log/2026-04-06T18-17-turk.md`

## Phase 2 Backlog

- Add input validation guard to `classifyBloodPressure()` per Carla's discovery (physiological bounds: systolic ≥ 40, diastolic ≥ 20)
- Pending Kelso validation of clinical lower bounds

