# Squad Decisions

## Active Decisions

### Clinical Decisions — Blood Pressure

**From:** Kelso (Medical Advisor)  
**Date:** 2026-04-06  
**Context:** Switch from ACC/AHA 2017 (U.S.) to ESC/ESH 2018 (European) hypertension classification; implement multi-reading detection and averaging.

---

#### Decision 1: Use ESC/ESH 2018 BP Classification Thresholds (Supersedes ACC/AHA 2017)

**What:** Adopt the **2018 ESC/ESH Hypertension Guidelines** for all home BP readings. Replaces previous ACC/AHA 2017 classification.

**The 7 ESC/ESH 2018 Categories:**

| Category | Systolic | AND | Diastolic | Clinical Guidance |
|----------|----------|-----|-----------|-------------------|
| **Optimal** | <120 mmHg | AND | <80 mmHg | Ideal; cardiovascular lowest risk |
| **Normal** | 120–129 mmHg | AND | <80 mmHg | Excellent; still considered normal |
| **High Normal** | 130–139 mmHg | AND/OR | 80–89 mmHg | Borderline; monitor closely |
| **Grade 1 Hypertension** | 140–159 mmHg | AND/OR | 90–99 mmHg | Mild HTN; lifestyle + pharmacological therapy |
| **Grade 2 Hypertension** | 160–179 mmHg | AND/OR | 100–109 mmHg | Moderate HTN; immediate pharmacological therapy |
| **Grade 3 Hypertension** | ≥180 mmHg | AND/OR | ≥110 mmHg | Severe HTN; urgent evaluation required |
| **Isolated Systolic Hypertension** | ≥140 mmHg | AND | <90 mmHg | Systolic elevated, diastolic normal; treat as HTN |

**Enum values:**
```typescript
enum BPCategory {
  OPTIMAL = 'optimal',
  NORMAL = 'normal',
  HIGH_NORMAL = 'high_normal',
  GRADE_1 = 'grade_1',
  GRADE_2 = 'grade_2',
  GRADE_3 = 'grade_3',
  ISOLATED_SYSTOLIC = 'isolated_systolic',
}
```

**Category Assignment Rule:**
- When systolic and diastolic fall into *different* categories, assign the **higher severity category**
- **Isolated Systolic HTN check is performed first:** If systolic ≥140 AND diastolic <90, classify as ISH regardless of systolic severity
- ISH is a distinct clinical entity per ESC/ESH guidelines

**Why:** 
- European clinical standard (ESC/ESH, WHO)
- All modern guidelines converge on similar thresholds
- More nuanced (7 vs. 5 categories) for better risk stratification
- Explicit "Optimal vs. Normal" distinction
- ISH recognition as distinct pattern

**Scope:** MVE, LLM coaching agent, doctor view.

**Status:** ✅ **Binding** — Implemented in `src/lib/classification/blood-pressure.ts`

---

#### Decision 2: Multi-Reading Averaging — Clinical Validity & Implementation

**What:** Blood pressure readings taken within 10 minutes of each other are grouped together, averaged, and classified as a single reading group.

**Clinical Validation:**
- **Is averaging 3 readings within 10 minutes clinically valid?** YES — Gold standard in clinical practice per ESC/ESH 2018 guidelines
- The ESC/ESH 2018 guidelines explicitly recommend: Take at least 2 readings, preferably 3, in the same session (1–2 minutes apart)
- Standard practice because:
  1. Reduces white-coat effect (first reading often artificially elevated)
  2. Captures typical BP, averages out transient fluctuations
  3. Matches home monitor conventions (designed for repeated same-session readings)

**Averaging Algorithm:**
- Method: **Mean of all N readings** (SUM ÷ N)
  - Systolic: (sys1 + sys2 + sys3) ÷ 3 → round to nearest integer
  - Diastolic: (dia1 + dia2 + dia3) ÷ 3 → round to nearest integer
  - Pulse: (pulse1 + pulse2 + pulse3) ÷ 3 → round to nearest integer
- **Grouping window:** Consecutive readings ≤10 minutes apart form one group
- **Classification:** Applied to the AVERAGED reading only, not individual readings
- **Rationale:** Clinically sound; matches clinical trial methodology. Avoids confusion (e.g., 3 different categories from one session)

**Data Model:**
```typescript
interface ReadingGroup<T> {
  id: string;
  readings: HealthMetric<T>[];  // individual readings
  average: T;                    // computed average
  timestamp: string;             // first reading's timestamp
  isGrouped: boolean;            // true if >1 reading in group
}
```

**Summary Stats:**
- `MetricSummary.count` = total individual readings
- `MetricSummary.groupCount` = number of groups (prevents triple-counting in 7-day summary)
- Summary calculations use group averages, not individual readings

**Display Labels:**
- Primary: "Average of 3 readings taken 2025-07-16 at 08:15"
- Compact: "Average (3 readings)"
- Timeline: "08:15 — Average 142/88 (3 readings) — Grade 1 HTN"
- Expandable: Click badge to show individual readings with time offsets (+0s, +62s, +124s)

**Status:** ✅ **Binding** — Implemented. API contract changed to ReadingGroup<T>[]. All consumers updated.

---

#### Decision 3: Category Assignment Uses the Higher of Systolic/Diastolic

**Algorithm:**
- Systolic and diastolic may fall into different ESC/ESH categories
- **Assign the higher severity category** when they differ
- Example: 155/102 (Grade 1 systolic, Grade 2 diastolic) → **Grade 2**

**Why:** Both components matter. When they disagree, classify at the worse level. Prevents underestimating risk.

**Status:** ✅ **Binding** — Core principle of ESC/ESH classification

---

#### Decision 4: Pulse Display Strategy

**What:** 
- Always show pulse alongside BP readings (smaller font, below systolic/diastolic)
- No automatic pulse-based alerts in the MVP
- Future phases (coaching agent, doctor view) can add pulse interpretation

**MVP Display:**
- Latest reading card: Show pulse beneath BP numbers (e.g., "72 bpm")
- Timeline entries: Include pulse in list view
- Multi-reading groups: Average pulse shown with individual pulse values on expansion

**Why:** Pulse is important clinical context. But standalone pulse interpretation in home settings is unreliable — resting HR varies by fitness, time of day, stress, caffeine. Show the data; let future features interpret smartly.

**Status:** ✅ **Binding** — always include pulse in readings and timeline; no MVP warnings.

---

#### Decision 5: Medical Disclaimer for Timeline View

**What:** Single, visible disclaimer at the **bottom of timeline view**:

**Recommended text:**
```
⚠️ This data is for informational purposes only. Blood pressure varies 
throughout the day and is influenced by stress, activity, and posture. 
Consult your physician to interpret these readings and adjust any health decisions.
```

**Placement:** 
- Footer of scrollable timeline
- Small text (10–12pt), gray color, visible on all devices
- Not repeated on individual readings

**Why:** Home BP readings are inherently variable. One clear disclaimer handles legal responsibility and sets patient expectations without inducing unnecessary anxiety.

**Status:** ✅ **Binding** — implement in timeline footer.

---

#### Decision 6: 7-Day Summary Should Show Average + Median + Range + Group Count

**What:** Summary card displays:

**Format:**
```
Systolic:   Avg 128  |  Median 126  |  Range 118–142 mmHg
Diastolic:  Avg 82   |  Median 81   |  Range 75–89 mmHg
Reading Groups: 5 sessions | 12 total readings over 7 days
```

**Rationale:**
- **Average:** Familiar, useful for trend
- **Median:** Robust to outliers
- **Range (min–max):** Shows variability, highlights anomalies
- **Group Count:** Critical context — matches user mental model (5 sessions, not 15 readings)
- **Individual reading count:** Transparency on how many measurements went into the average

**Why:** Average alone is misleading. With multi-reading grouping, group count (sessions) is more meaningful than total reading count (which can inflate due to averaging).

**Status:** ✅ **Binding** — Implemented in `MetricSummary` with `groupCount` field

---

### Architecture Decisions — MVE

**From:** Cox (Lead/Architect)  
**Date:** 2025-07-15  
**Context:** MVE PRD finalized — these are the binding architecture decisions.

---

#### Decision 1: Next.js 14+ with App Router, TypeScript

**What:** Single project for frontend and backend. API routes serve as the backend. TypeScript end-to-end.

**Why:** Minimal deployment surface (one project, not two). Shared types between API and UI eliminate a whole class of bugs. Deploys to Azure with env var changes only.

**Trade-off:** Team must know Next.js. This is a reasonable expectation for a modern web project.

**Status:** ✅ Decided

---

#### Decision 2: Metric-Agnostic Data Model with Generic Types

**What:** `HealthMetric<T>` generic base type. Blood pressure is `HealthMetric<BloodPressureData>`. New metric types implement their own `T`.

**Why:** Jan explicitly said "avoid heavy refactorings in the future." Adding heart rate or ECG should be additive — new type, new adapter, new component. The service layer, API routes, and hooks don't change.

**Trade-off:** Slightly more abstraction in the MVE than strictly necessary. Cost: ~1 hour. Payoff: avoids rewriting the data pipeline for every new metric.

**Status:** ✅ Decided

---

#### Decision 3: DataSourceAdapter Interface (Adapter Pattern)

**What:** All external data sources implement `DataSourceAdapter`. Withings is the first implementation. The rest of the system calls the interface, never the Withings API directly.

**Why:** Future sources (Garmin, Apple Health, manual entry) slot in without touching business logic. Also makes testing trivial — mock the adapter.

**Status:** ✅ Decided

---

#### Decision 4: AuthProvider Abstraction (No OAuth in MVE)

**What:** `AuthProvider` interface with a single `getAccessToken()` method. MVE implementation reads from `WITHINGS_ACCESS_TOKEN` env var. OAuth is a future implementation of the same interface.

**Why:** Jan said "if multi-user OAuth is easy, do it." Withings OAuth is not easy — it's a full redirect flow with PKCE, token refresh, and session management. The abstraction (20 min) gives us the same future-proofing benefit without the 2-3 day OAuth implementation.

**Status:** ✅ Decided

---

#### Decision 5: Fetch-on-Demand, No Database

**What:** Every page load fetches fresh data from Withings API. No local DB, no caching layer.

**Why:** Simplest possible data flow. Add caching only when rate limits or latency force the issue.

**Risk:** If Withings rate-limits us, we'll need to add caching. Turk to investigate rate limits.

**Status:** ✅ Decided

---

#### Decision 6: Clinical Classification in the Service Layer

**What:** BP category assignment (Normal, Elevated, etc.) happens server-side in the service layer, not in UI components.

**Why:** Three future consumers need this classification: timeline UI, LLM coaching agent, doctor view. If it lives in the UI, the other two consumers can't use it. Service-layer classification is reusable.

**Dependency:** Kelso to confirm AHA classification thresholds.

**Status:** ✅ Decided

---

#### Decision 7: Single Parameterized API Route

**What:** `GET /api/health/metrics?type=blood_pressure` — one route, metric type as a parameter. Not `/api/blood-pressure`, `/api/heart-rate`, etc.

**Why:** New metric types don't need new routes. The route delegates to the metric registry. Less code, less routing complexity.

**Status:** ✅ Decided

---

#### Decision 8: No Charts in MVE

**What:** Timeline is a chronological list, not a chart/graph.

**Why:** Charts require a charting library, design decisions about axes/scales, and responsive behavior. The list communicates the same information and ships faster. Charts are Phase 2.

**Status:** ✅ Decided

---

*These decisions are binding unless overridden by team consensus. Disagreements go through Cox.*

---

### Architecture Decisions — API & Data

**From:** Turk (Backend Dev)  
**Date:** 2026-04-06  
**Title:** Withings API Uses POST with URL-Encoded Body

**What:** The Withings `measure?action=getmeas` endpoint requires `POST` with `Content-Type: application/x-www-form-urlencoded` and a Bearer token in the Authorization header. Not a GET with query params.

**Why it matters:** Anyone touching the adapter or writing tests needs to know this — mocking a GET won't work. Withings docs are ambiguous on this; confirmed via their API reference.

**Implementation detail:** Measure values from Withings use `value * 10^unit` format (e.g., value=128, unit=0 → 128 mmHg). The `unit` field is an exponent, not a unit label.

**Status:** ✅ Implemented in `src/lib/adapters/withings-adapter.ts`

---

### OAuth & Token Management

**From:** Turk (Backend Dev)  
**Date:** 2026-04-06  
**Title:** OAuth Token Helper Uses Local Callback Server

**What:** The `scripts/get-token.ts` helper uses a local HTTP server on port 3000 at `/api/auth/callback` to catch the OAuth redirect — the same path the Next.js app would use in production. This means the redirect URI registered in the Withings developer portal (`http://localhost:3000/api/auth/callback`) works for both the helper script and future OAuth integration.

**Why:**
- No copy-pasting authorization codes manually
- The callback path matches the app's eventual auth route, so one redirect URI registration covers both
- State parameter validation prevents CSRF in the redirect flow

**Trade-off:** Port 3000 conflicts with `next dev`. The script is meant to be run standalone before starting the app, not alongside it. If this becomes an issue, we can make the port configurable.

**Status:** ✅ Implemented. Users can run `npm run get-token` to retrieve access tokens.

---

### Bug Fixes

**From:** Turk (Backend Dev)  
**Date:** 2026-04-06  
**Title:** Withings API `meastype` → `meastypes` Fix

**What was broken:** The adapter used `meastype: '10'` (singular) which tells the Withings API to only return systolic measures within each group. Diastolic and pulse measures were stripped from the response. The mapping code then skipped every reading because `diastolicMeas` was always `undefined`.

**Root cause:** `meastype` (singular) filters individual measures, not groups. The comment `// Withings returns all BP measures in the group` was incorrect.

**Fix:** Changed to `meastypes: '9,10,11'` (plural, comma-separated) which requests all three BP measure types. The full group now includes systolic, diastolic, and pulse.

**Also added:** `[Withings]`-prefixed debug logging — request params, HTTP status, API status, measure group count, and parsed BP readings count. Visible in server console output.

**File:** `src/lib/adapters/withings-adapter.ts`

**Build:** ✅ Passes

**Status:** ✅ Implemented

---

### Data Quality Decisions — Input Validation

**From:** Carla (Tester)  
**Date:** 2026-04-06  
**Title:** Add Input Validation to BP Classification (Phase 2)

**Observation:** `classifyBloodPressure()` accepts any number without validation. Zero and negative values silently classify as "normal" because they fall below all thresholds. This is mathematically correct but clinically meaningless.

**Risk:**
- A sensor glitch sending `0/0` would display as "Normal" — misleading
- The LLM coaching agent (Phase 2) could interpret a zero reading as healthy
- The doctor view (Phase 3) showing `0/0 — Normal` would erode trust immediately

**Recommendation:** Add a guard to `classifyBloodPressure()` that throws or returns a distinct status for physiologically impossible values. Reasonable lower bounds: systolic ≥ 40 mmHg, diastolic ≥ 20 mmHg.

**Priority:** Low (MVE safe — Withings API won't send zeroes) → Medium (before Phase 2 coaching agent)

**Status:** 📋 Proposed for Phase 2. **Assigned to:** Turk (implementation), Kelso (clinical lower bounds validation)

---

### Frontend UI Decisions — ESC/ESH & Multi-Reading Display

**From:** Elliot (Frontend Developer)  
**Date:** 2026-04-06  
**Context:** ESC/ESH 2018 classification migration + ReadingGroup UI support

---

#### Decision 1: Shared Category Config Utility

**What:** Extracted `categoryConfig` (label + Tailwind color classes) from individual components into `src/lib/ui/category-config.ts`. Both UI components now import from the shared module.

**Why:** Category config was duplicated in two components. With 7 categories (up from 5), keeping them in sync would be error-prone. Any new component that needs BP category badges just imports the config.

**Implementation:** `categoryConfig` object maps BPCategory enum to display label and Tailwind classes:
```typescript
const categoryConfig = {
  OPTIMAL: { label: 'Optimal', classes: 'bg-green-100 text-green-800' },
  NORMAL: { label: 'Normal', classes: 'bg-green-50 text-green-700' },
  HIGH_NORMAL: { label: 'High Normal', classes: 'bg-yellow-100 text-yellow-800' },
  // ... etc.
}
```

**Status:** ✅ Implemented in `src/lib/ui/category-config.ts`

---

#### Decision 2: ESC/ESH 2018 Category Badge Colors

**What:** Updated all category badges to match ESC/ESH 2018 classification:

| Category | Tailwind Classes | Rationale |
|----------|-----------------|-----------|
| Optimal | `bg-green-100 text-green-800` | Ideal; cardiovascular lowest risk |
| Normal | `bg-green-50 text-green-700` | Excellent; still normal |
| High Normal | `bg-yellow-100 text-yellow-800` | Borderline; monitor closely |
| Grade 1 | `bg-orange-100 text-orange-800` | Mild hypertension |
| Grade 2 | `bg-red-100 text-red-800` | Moderate hypertension |
| Grade 3 | `bg-red-200 text-red-900` | Severe hypertension |
| Isolated Systolic | `bg-purple-100 text-purple-800` | Distinct clinical pattern |

**Why:** 
- Backend switched from AHA to ESC/ESH classification
- Colors progress from green → yellow → orange → red with increasing severity
- Purple for Isolated Systolic distinguishes it as a distinct clinical entity
- Consistent with modern blood pressure monitoring apps

**Status:** ✅ Implemented

---

#### Decision 3: Expand/Collapse Pattern for Grouped Readings

**What:** When `isGrouped: true`, grouped readings show:
- A small `×N` badge (blue, clickable) in TimelineEntry (e.g., "×3" for 3 readings)
- A "Show individual readings" link in LatestReading
- On click, expands to show individual readings with time offsets (+0s, +62s, +124s)
- Uses Tailwind `max-h` + `opacity` transitions for smooth animation

**Why:** Users taking 3 readings in a row (common with Withings devices) need to see the individual readings that make up an average, but shouldn't be cluttered by them by default.

**Trade-off:** Used CSS max-h transitions instead of a library like framer-motion. Slightly less smooth for variable-height content, but zero added dependencies.

**UX Details:**
- Timeline shows only average by default (clean, scannable)
- Click ×N badge to expand inline
- LatestReading shows average prominently; "Show readings" link below
- Individual readings labeled with offsets: "Reading 1 (+0s), Reading 2 (+62s), Reading 3 (+124s)"

**Status:** ✅ Implemented

---

#### Decision 4: ReadingGroup as Primary Data Shape

**What:** All frontend components now consume `ReadingGroup<T>[]` instead of `HealthMetric<T>[]`:
- `useHealthData` hook
- `Timeline`, `TimelineEntry` components
- `LatestReading`, `SummaryCard` components
- `page.tsx`

**API contract:** MetricsResponse updated to return `ReadingGroup<T>[]` instead of `HealthMetric<T>[]`

**Why:** The API groups consecutive readings taken within 10 minutes into averaged groups. Single readings are wrapped as `ReadingGroup` with `isGrouped: false` — so the UI handles both cases uniformly. Eliminates conditional logic throughout the UI.

**Impact:** Breaking change to all component props. All tests updated to reflect new data shape.

**Status:** ✅ Implemented

---

#### Decision 5: SummaryCard Shows Group Count

**What:** SummaryCard now displays:
- **Primary metric:** `groupCount` (number of reading groups/sessions)
- **Subtitle:** How many groups are averaged (e.g., "5 sessions, 12 readings")

**Why:** Displaying total individual readings (e.g., 15) when the user took 5 sessions (some with 3 readings each) is misleading. Group count (5) matches the user's mental model ("I took readings 5 times this week").

**Calculation (in page.tsx):**
- Count total groups in data
- Count total individual readings across all groups
- Compute average readings per group
- Pass to SummaryCard for display

**Status:** ✅ Implemented

---

### Implementation Summary — ESC/ESH & Multi-Reading

**From:** Engineering Team  
**Date:** 2026-04-06  
**Scope:** Full implementation of ESC/ESH 2018 classification + multi-reading grouping + expandable UI

---

#### Files Changed (Backend)

| File | Change | Impact |
|------|--------|--------|
| `src/lib/types/metrics.ts` | Added ReadingGroup<T>, updated BPCategory enum (7 categories), added groupCount | Type system update |
| `src/lib/classification/blood-pressure.ts` | Replaced AHA thresholds with ESC/ESH 2018, added ISH logic | Classification logic |
| `src/lib/services/health-data-service.ts` | Added grouping algorithm (10-min window), averaging logic, classification on grouped readings | Core service logic |
| `src/app/api/health/metrics/route.ts` | Updated response to return ReadingGroup[] instead of HealthMetric[] | API contract change (breaking) |

#### Files Changed (Frontend)

| File | Change | Impact |
|------|--------|--------|
| `src/lib/ui/category-config.ts` | New shared category config (7 ESC categories + colors) | Shared component resource |
| `src/components/LatestReading.tsx` | ReadingGroup support, "Show readings" expand/collapse | UI update |
| `src/components/TimelineEntry.tsx` | ReadingGroup support, ×N badge, expand/collapse | UI update |
| `src/components/SummaryCard.tsx` | Group count display with averaged readings subtitle | Summary metric update |
| `src/components/Timeline.tsx` | ReadingGroup data shape integration | Component data layer |
| `src/hooks/useHealthData.ts` | ReadingGroup response parsing | Hook update |
| `src/app/page.tsx` | averagedGroupCount computation for display | Page logic |

#### Test Coverage

- `src/__tests__/blood-pressure.test.ts` — ESC/ESH thresholds (7 categories + boundaries)
- `src/__tests__/health-data-service.test.ts` — Grouping + averaging logic
- `src/__tests__/latest-reading.test.tsx` — Expand/collapse UI
- `src/__tests__/timeline-entry.test.tsx` — ×N badge display
- `src/__tests__/summary-card.test.tsx` — Group count computation

**Result:** ✅ 65 tests passing, `tsc --noEmit` clean

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
