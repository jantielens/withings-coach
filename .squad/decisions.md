# Squad Decisions

## Active Decisions

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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
