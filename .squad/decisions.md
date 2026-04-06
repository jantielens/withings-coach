# Squad Decisions

## Active Decisions

### Clinical Decisions — Blood Pressure

**From:** Kelso (Medical Advisor)  
**Date:** 2025-07-15  
**Context:** Cox's 5 clinical questions on blood pressure classification, thresholds, display, disclaimers, and summary statistics. All resolved.

---

#### Decision 1: Use 2017 ACC/AHA BP Classification Thresholds

**What:** Adopt the **2017 American College of Cardiology / American Heart Association Blood Pressure Classification** for all home BP readings.

**Thresholds:**

| Category | Systolic | Diastolic | When to Assign |
|----------|----------|-----------|-----------------|
| **Normal** | <120 mmHg | AND <80 mmHg | Both below thresholds |
| **Elevated** | 120–129 mmHg | AND <80 mmHg | Systolic borderline, diastolic normal |
| **High BP Stage 1** | 130–139 mmHg | OR 80–89 mmHg | Either component in stage 1 range |
| **High BP Stage 2** | ≥140 mmHg | OR ≥90 mmHg | Either component in stage 2 range |
| **Hypertensive Crisis** | >180 mmHg | OR >120 mmHg | Emergency level (rare in home settings) |

**Enum values:**
```typescript
enum BPCategory {
  NORMAL = 'normal',
  ELEVATED = 'elevated',
  HIGH_STAGE_1 = 'high_stage_1',
  HIGH_STAGE_2 = 'high_stage_2',
  CRISIS = 'crisis',
}
```

**Why:** Current U.S. clinical standard (ACC, AHA, AMA). All home BP monitors use them. Physicians expect them. Clinically appropriate for all patient populations.

**Scope:** MVE, LLM coaching agent, doctor view.

**Status:** ✅ **Binding** — implement in `lib/classification/blood-pressure.ts`

---

#### Decision 2: Category Assignment Uses the Higher of Systolic/Diastolic

**What:** When systolic and diastolic fall into different categories, assign the **higher severity category**.

**Algorithm:**
```typescript
const systolicCategory = getCategory(reading.systolic);
const diastolicCategory = getCategory(reading.diastolic);
reading.category = max(systolicCategory, diastolicCategory);
```

**Example:**
- Reading: 128/82
- Systolic 128 → Elevated
- Diastolic 82 → Stage 1
- **Assigned category:** Stage 1 (higher severity)

**Why:** Both components matter. When they disagree, classify at the worse level. Prevents underestimating risk.

**Status:** ✅ **Binding** — implement in classification logic.

---

#### Decision 3: Pulse Display Strategy

**What:** 
- Always show pulse alongside BP readings (smaller font, below systolic/diastolic)
- No automatic pulse-based alerts in the MVP
- Future phases (coaching agent, doctor view) can add pulse interpretation

**MVP Display:**
- Latest reading card: Show pulse beneath BP numbers (e.g., "72 bpm")
- Timeline entries: Include pulse in list view

**Why:** Pulse is important clinical context. But standalone pulse interpretation in home settings is unreliable — resting HR varies by fitness, time of day, stress, caffeine. Show the data; let future features interpret smartly.

**Status:** ✅ **Binding** — always include pulse in readings and timeline; no MVP warnings.

---

#### Decision 4: Medical Disclaimer for Timeline View

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

#### Decision 5: 7-Day Summary Should Show Average + Median + Range + Count

**What:** Summary card displays:

**Format:**
```
Systolic:   Avg 128  |  Median 126  |  Range 118–142 mmHg
Diastolic:  Avg 82   |  Median 81   |  Range 75–89 mmHg
Readings:   12 measurements over 7 days
```

**Rationale:**
- **Average:** Familiar, useful for trend
- **Median:** Robust to outliers
- **Range (min–max):** Shows variability, highlights anomalies
- **Count:** Critical context — average of 3 is less reliable than average of 15

**Why:** Average alone is misleading. Median + range + count tell the clinical story.

**Status:** ✅ **Binding** — implement in `MetricSummary` for blood pressure.

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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
