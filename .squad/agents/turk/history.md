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

**2025-07-25 — General Context (Context Notes) Feature:**
- Added `context_notes` table to the existing diary SQLite database — same `initDb()` function, second `CREATE TABLE IF NOT EXISTS`. No new DB file needed.
- New CRUD service (`context-service.ts`) follows the exact same sql.js patterns as diary-service: positional params, `stmt.bind()/step()/get()/free()`, manual `saveDb()` after writes, singleton `getDb()`.
- ID format uses `ctx_${userId}_${Date.now()}` — timestamp-based, no date dependency unlike diary entries which are keyed by date.
- `orderIdx` auto-assigns via `SELECT MAX(orderIdx)` when not provided, so notes append in order by default.
- API route mirrors diary route conventions: GET returns `{ notes }`, POST returns `{ note }` with 201, DELETE checks existence and returns 404 if not found.
- Prompt builder now accepts optional `contextNotes` param — backward compatible, existing callers unaffected. General Context section renders between Goal and Patient Context sections, omitted when empty.

**2025-07-24 — Migrated from better-sqlite3 to sql.js (pure JS SQLite):**
- `better-sqlite3` native C++ module kept failing with `NODE_MODULE_VERSION` mismatch and `ERR_DLOPEN_FAILED` in Next.js Turbopack. `serverExternalPackages` was a brittle workaround that broke across Node versions.
- Switched to `sql.js` — SQLite compiled to JavaScript via Emscripten. Zero native bindings, always works.
- **Critical discovery:** The default `sql.js` import uses WASM (`sql-wasm.js` + `sql-wasm.wasm`), but Turbopack rewrites the WASM file path to `/ROOT/node_modules/...` which doesn't exist at runtime. Fix: import `sql.js/dist/sql-asm.js` instead — pure asm.js, no WASM file needed.
- sql.js is async to initialize (unlike better-sqlite3 which is synchronous). `getDb()` now returns `Promise<Database>`, and all diary-service functions are async.
- sql.js doesn't auto-persist to disk. Implemented manual `saveDb()` that calls `db.export()` → `Buffer.from(data)` → `fs.writeFileSync()` after every write operation (upsert, delete).
- sql.js uses positional params (arrays) not named params. Queries use `db.run(sql, [...params])` and `db.prepare()` + `stmt.bind([...])` + `stmt.step()` + `stmt.get()` + `stmt.free()`.
- Singleton pattern uses a `dbReady` promise to prevent race conditions when multiple requests hit `getDb()` simultaneously during initialization.
- Removed `serverExternalPackages: ['better-sqlite3']` from `next.config.ts` — no longer needed.
- API contract unchanged — same endpoints, same request/response format. Frontend unaffected.

**2025-07-23 — Diary Storage Backend (SQLite + Service + API):**
- Built full diary CRUD stack: SQLite database (`better-sqlite3`), service layer, and REST API route.
- Schema uses `UNIQUE(userId, date)` constraint — one diary entry per user per day, upsert semantics on POST.
- Used `INSERT OR REPLACE` but preserved `createdAt` by checking for existing row first, so updates don't overwrite the original creation timestamp.
- `better-sqlite3` is synchronous — no async overhead, perfect for Next.js API routes on server side.
- DB file stored in `data/diary.db` (gitignored), auto-creates `data/` directory on first access. WAL mode enabled for concurrent read performance.
- Integrated diary into prompt builder: optional `diaryEntries` parameter keeps backward compatibility with existing callers (LLMPromptDebugger passes 2 args, still works). Added "Patient Context" section and a "Diary" column in the data table.
- API supports any date (past, present, future) — no restriction to "today only". Users can annotate historical days when reviewing their timeline.

**2025-07-22 — Default Date Range Change (7 → 30 days):**
- Changed `METRIC_DEFAULTS.defaultDays` from 7 to 30 in `src/config/metrics.ts` to support the new condensed timeline view. The route, service layer, and Withings adapter required zero structural changes — they're fully parameterized via `DateRange` and handle arbitrary volumes. Frontend can still override with `?from=...` query param (e.g., 7-day window for expanded mode). Single config line change, build passes.

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

## Completed Work (2025-07-23 — better-sqlite3 Fix)

**Task:** Fix `ERR_DLOPEN_FAILED` error when loading the `better-sqlite3` native module.
**Root Cause:** Next.js was webpack-bundling `better-sqlite3`, which breaks native C++ modules. The compiled `.node` binary can't survive webpack's module resolution.
**Fix:** Added `serverExternalPackages: ['better-sqlite3']` to `next.config.ts`. This tells Next.js to load the module directly from `node_modules` at runtime instead of bundling it. Also rebuilt the native module with `npm rebuild better-sqlite3` to ensure it matches the current Node.js version.
**Verification:** `npm run build` passes, `GET /api/diary` returns valid JSON response — no more `ERR_DLOPEN_FAILED`.
**File Modified:** `next.config.ts`

## Phase 2 Backlog

- Add input validation guard to `classifyBloodPressure()` per Carla's discovery (physiological bounds: systolic ≥ 40, diastolic ≥ 20)
- Pending Kelso validation of clinical lower bounds

