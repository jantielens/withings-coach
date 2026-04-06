# Withings Coach — MVE Product Requirements Document

**Version:** 1.0
**Author:** Cox (Lead/Architect)
**Date:** 2025-07-15
**Status:** Draft — pending team review

---

## 1. Problem Statement

People who track their health with Withings devices have data locked inside the Withings app. That app shows numbers but doesn't connect the dots — no trends, no coaching, no way to share a clean summary with a doctor.

Withings Coach gives users a single timeline of their health data with three future output modes: a personal timeline view, an LLM-powered coaching agent, and a doctor-ready summary. The MVE proves the data pipeline works end-to-end: Withings API → normalized data layer → rendered timeline. Everything else builds on that spine.

---

## 2. MVE Scope

### In Scope

- **Blood pressure data** from Withings API (last 7 days)
- **Health timeline view** — a single-page web UI showing BP readings over time
- **Fetch-on-demand** — no local database, no caching layer
- **Hardcoded auth token** — single user, no login flow
- **Localhost deployment** — `npm run dev` and you're running

### Explicitly Out of Scope

See [Section 9](#9-out-of-scope-for-mve) for the full list.

---

## 3. User Stories

### US-1: View My Blood Pressure Timeline

> As a Withings user, I want to see my blood pressure readings from the last 7 days on a timeline, so I can visually spot trends without opening the Withings app.

**Acceptance criteria:**
- Timeline displays systolic, diastolic, and pulse for each reading
- Readings are ordered chronologically
- Each reading shows date and time
- Empty state handled gracefully (no readings in last 7 days)

### US-2: See My Latest Reading at a Glance

> As a user, I want to see my most recent blood pressure reading prominently displayed, so I can quickly check my current status.

**Acceptance criteria:**
- Latest reading shown at the top of the page with systolic/diastolic/pulse
- Timestamp of the reading is visible
- Reading is visually distinguished from the timeline

### US-3: Understand If My Reading Is Normal

> As a user, I want my blood pressure readings color-coded or labeled by clinical category (normal, elevated, high), so I can understand what the numbers mean.

**Acceptance criteria:**
- Each reading is tagged with a clinical category
- Categories follow standard BP classification (see [Open Questions](#10-open-questions) — needs Kelso's input)
- Color or label is visible on both the latest reading and timeline entries

### US-4: Refresh My Data

> As a user, I want to refresh the timeline to see new readings, so the view stays current after I take a measurement.

**Acceptance criteria:**
- A refresh action re-fetches data from Withings API
- Loading state shown during fetch
- Error state shown if API call fails

### US-5: See a 7-Day Summary

> As a user, I want to see a simple summary of my blood pressure over the last 7 days (average, min, max), so I can understand my overall trend.

**Acceptance criteria:**
- Summary shows average, minimum, and maximum systolic and diastolic values
- Summary is computed from the fetched readings
- Summary updates when data is refreshed

---

## 4. Technical Architecture

### 4.1 Stack Decision

**Next.js 14+ with App Router, TypeScript.**

Rationale:
- Single project for both frontend and API routes — minimal deployment surface
- API routes become the backend; no separate server to manage
- TypeScript end-to-end — shared types between API and UI
- Deploys to Azure App Service or Azure Static Web Apps with zero config changes
- React ecosystem for the UI layer

### 4.2 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Timeline UI │  │ Summary  │  │ Latest     │ │
│  │ Component   │  │ Card     │  │ Reading    │ │
│  └──────┬──────┘  └────┬─────┘  └─────┬──────┘ │
│         └───────────┬──┘──────────────┘         │
│              useHealthData() hook                │
└──────────────────────┬──────────────────────────┘
                       │ fetch()
                       ▼
┌──────────────────────────────────────────────────┐
│              Next.js API Routes                   │
│  GET /api/health/metrics?type=blood_pressure     │
│                      │                            │
│         ┌────────────▼────────────┐              │
│         │   HealthDataService     │              │
│         │   (metric-agnostic)     │              │
│         └────────────┬────────────┘              │
│                      │                            │
│         ┌────────────▼────────────┐              │
│         │   DataSourceAdapter     │  ← interface │
│         │   ┌──────────────────┐  │              │
│         │   │WithingsAdapter   │  │  ← impl     │
│         │   └──────────────────┘  │              │
│         └────────────┬────────────┘              │
│                      │                            │
│         ┌────────────▼────────────┐              │
│         │   AuthProvider          │  ← interface │
│         │   ┌──────────────────┐  │              │
│         │   │StaticTokenAuth   │  │  ← impl     │
│         │   └──────────────────┘  │              │
│         └─────────────────────────┘              │
└──────────────────────┬───────────────────────────┘
                       │ HTTPS
                       ▼
              ┌─────────────────┐
              │  Withings API   │
              └─────────────────┘
```

### 4.3 Data Layer — Metric-Agnostic Design

The data layer knows about "health metrics" — it does **not** know about blood pressure specifically. Blood pressure is one metric type registered in a metric registry.

**Key principle:** Adding a new metric type (heart rate, ECG, weight) should require:
1. A new type definition
2. A new adapter mapping (Withings API response → normalized type)
3. A new UI component for rendering

It should **not** require changes to the service layer, API routes, or data flow.

**Implementation:**
- `MetricType` enum — extensible, config-driven
- `MetricRegistry` — maps metric types to their adapters and UI components
- `HealthDataService` — operates on `MetricType`, delegates to registry

### 4.4 API Abstraction — Adapter Pattern

The `DataSourceAdapter` interface abstracts all external data sources. The Withings API is the first implementation. If we ever add Apple Health, Garmin, or manual entry — they implement the same interface.

```
DataSourceAdapter
├── WithingsAdapter (MVE)
├── GarminAdapter (future)
└── ManualEntryAdapter (future)
```

Each adapter:
- Accepts a `MetricType` and a date range
- Returns normalized `HealthMetric[]`
- Handles its own API specifics internally

### 4.5 Auth Layer — Start Simple, Designed for Upgrade

**MVE:** `StaticTokenAuth` reads a hardcoded Withings API token from an environment variable (`WITHINGS_ACCESS_TOKEN`).

**Interface:** `AuthProvider` with a single method: `getAccessToken(): Promise<string>`. This is the only thing the rest of the system calls. When we upgrade to OAuth:
1. Implement `OAuthProvider` (handles token refresh, redirect flow)
2. Swap the provider in the config
3. Nothing else changes

**Decision:** We are **not** implementing OAuth in the MVE. The env var approach is simpler and the abstraction means zero refactoring when OAuth lands. Jan said "if it's easy" — OAuth with Withings is not easy (it's a full redirect flow with PKCE). The abstraction is the investment.

### 4.6 Frontend Data Flow

```
Component → useHealthData(metricType, dateRange) → fetch(/api/health/metrics) → render
```

- **Single custom hook** (`useHealthData`) handles fetching, loading states, and error states
- Components receive typed data — they never touch the API directly
- The hook is metric-agnostic: `useHealthData('blood_pressure', { days: 7 })`
- Future: swap `fetch` for React Query/SWR if caching becomes needed

---

## 5. Data Model

### Core Types

```typescript
// Metric type registry — add new types here
enum MetricType {
  BLOOD_PRESSURE = 'blood_pressure',
  // Future: HEART_RATE = 'heart_rate',
  // Future: ECG = 'ecg',
  // Future: WEIGHT = 'weight',
}

// Base metric — every health data point extends this
interface HealthMetric<T> {
  id: string;
  type: MetricType;
  timestamp: Date;       // when the measurement was taken
  source: string;        // e.g., 'withings', 'garmin', 'manual'
  data: T;               // metric-specific payload
}

// Blood pressure payload
interface BloodPressureData {
  systolic: number;      // mmHg
  diastolic: number;     // mmHg
  pulse: number;         // bpm
  category: BPCategory;  // clinical classification
}

// Clinical categories — needs Kelso's review
enum BPCategory {
  NORMAL = 'normal',
  ELEVATED = 'elevated',
  HIGH_STAGE_1 = 'high_stage_1',
  HIGH_STAGE_2 = 'high_stage_2',
  CRISIS = 'crisis',
}

type BloodPressureMetric = HealthMetric<BloodPressureData>;

// API response wrapper
interface MetricsResponse<T> {
  metrics: HealthMetric<T>[];
  summary: MetricSummary | null;
  fetchedAt: string;     // ISO timestamp
}

// Summary statistics
interface MetricSummary {
  type: MetricType;
  period: { from: string; to: string };
  count: number;
  stats: Record<string, { avg: number; min: number; max: number }>;
  // For BP: stats keys are 'systolic', 'diastolic', 'pulse'
}
```

### Auth Types

```typescript
interface AuthProvider {
  getAccessToken(): Promise<string>;
}

interface DataSourceAdapter {
  fetchMetrics<T>(
    type: MetricType,
    dateRange: DateRange,
    auth: AuthProvider
  ): Promise<HealthMetric<T>[]>;

  getSupportedMetrics(): MetricType[];
}

interface DateRange {
  from: Date;
  to: Date;
}
```

---

## 6. API Endpoints

### `GET /api/health/metrics`

Fetches health metrics from the configured data source.

| Parameter | Type   | Required | Default        | Description                     |
|-----------|--------|----------|----------------|---------------------------------|
| `type`    | string | Yes      | —              | Metric type (e.g., `blood_pressure`) |
| `from`    | string | No       | 7 days ago     | ISO date string — start of range |
| `to`      | string | No       | now            | ISO date string — end of range   |
| `summary` | boolean| No       | `true`         | Include summary statistics       |

**Response:** `MetricsResponse<T>` (see Data Model)

**Errors:**
| Status | Meaning |
|--------|---------|
| 400    | Invalid metric type or date range |
| 401    | Auth token missing or invalid |
| 502    | Withings API error (upstream failure) |

### `GET /api/health/types`

Returns the list of supported metric types. Used by the frontend to know what's available.

**Response:**
```json
{
  "types": [
    {
      "id": "blood_pressure",
      "label": "Blood Pressure",
      "unit": "mmHg",
      "available": true
    }
  ]
}
```

---

## 7. UI Wireframe Description

### Single-Page Layout

The MVE is a single page with three vertical sections. No navigation, no sidebar, no settings. One page, one purpose.

#### Header Bar
- App title: "Withings Coach"
- Subtitle: "Last 7 days"
- Refresh button (top right) — triggers data re-fetch
- Minimal branding, clean typography

#### Section 1: Latest Reading Card
- **Position:** Top of page, full width
- **Content:** Most recent blood pressure reading displayed large
  - Systolic/diastolic in large font (e.g., "128/82")
  - Pulse below in smaller font (e.g., "72 bpm")
  - Clinical category as a colored badge (e.g., green "Normal", yellow "Elevated")
  - Timestamp: "Today at 8:32 AM" or "Yesterday at 6:15 PM"
- **Empty state:** "No readings in the last 7 days. Take a measurement with your Withings device."

#### Section 2: 7-Day Summary Card
- **Position:** Below latest reading
- **Content:** Three mini-stat cards in a row:
  - Average: "Avg 125/80"
  - Range: "118–134 / 76–88"
  - Reading count: "12 readings"
- **Empty state:** Hidden when no readings

#### Section 3: Timeline
- **Position:** Below summary, scrollable
- **Content:** Chronological list of readings (newest first)
  - Each entry: date/time, systolic/diastolic, pulse, category badge
  - Entries grouped by day with day headers ("Monday, Jul 14")
  - Simple list layout — no chart in MVE (chart is a future enhancement)
- **Loading state:** Skeleton loaders for each section
- **Error state:** Inline error message with retry button

#### Responsive Behavior
- Desktop: Centered content column (max-width ~720px)
- Mobile: Full-width, same vertical layout
- No breakpoint complexity — the vertical stack works at every size

---

## 8. Future-Proofing Decisions

These are architectural investments we're making **now** to avoid refactoring later. Each one adds a small amount of work to the MVE but saves a large amount of work when the feature lands.

| # | Decision | MVE Cost | Future Payoff |
|---|----------|----------|---------------|
| 1 | **Metric-agnostic data model** — `HealthMetric<T>` generic instead of `BloodPressureReading` | ~1 hour | Adding HR, ECG, weight = new type + adapter. No service/API/hook changes. |
| 2 | **DataSourceAdapter interface** — Withings behind an abstraction | ~30 min | Swap/add data sources without touching business logic |
| 3 | **AuthProvider interface** — token retrieval behind abstraction | ~20 min | OAuth upgrade = new provider implementation, zero changes elsewhere |
| 4 | **MetricType registry** — config-driven metric types | ~30 min | New metric types are declarative, not imperative |
| 5 | **API route uses `type` parameter** — not `/api/blood-pressure` | ~0 min (good design is free) | New metrics don't need new routes |
| 6 | **`useHealthData` hook is metric-agnostic** | ~15 min | New metrics reuse the same data-fetching logic |
| 7 | **Clinical categories as data, not UI logic** — classification happens in the service layer | ~30 min | LLM coaching agent and doctor view can reuse classifications without importing UI code |
| 8 | **Environment-based configuration** — tokens, API URLs in env vars | ~10 min | Azure deployment = set env vars, no code changes |
| 9 | **Separate `/api/health/types` endpoint** | ~15 min | Frontend auto-discovers available metrics — no hardcoded UI when we add types |

**Total future-proofing investment: ~3 hours.** This is cheap insurance.

---

## 9. Out of Scope for MVE

| Feature | Why Not Now |
|---------|-------------|
| **Heart rate, ECG, weight data** | Architecture supports it; we add types after BP works end-to-end |
| **LLM coaching agent** | Requires prompt engineering, conversation UI, and JD's involvement. Phase 2. |
| **Doctor-friendly view** | Different UI, different data presentation. Phase 3. |
| **OAuth / multi-user auth** | Withings OAuth is a full redirect flow with PKCE. The abstraction is in place; implementation is Phase 2. |
| **Local database / caching** | Fetch-on-demand is simpler. Add caching only when latency or rate limits become a problem. |
| **Data charts / visualizations** | Timeline list is sufficient for MVE. Charts are a Phase 2 UI enhancement. |
| **Azure deployment** | Localhost first. Azure deployment is a configuration exercise once the app works. |
| **Offline support** | Not needed. Always-online is the requirement. |
| **Notifications / alerts** | No push, no email, no alerts. Users open the app when they want to check. |
| **Data export** | No CSV, no PDF, no sharing in MVE. |
| **Multi-device support** | Single Withings account, single token. |

---

## 10. Open Questions

### For Kelso (Medical Advisor)

1. **BP classification thresholds:** We're using standard AHA categories (Normal, Elevated, High Stage 1, High Stage 2, Crisis). Are these the right categories for our user audience? Should we use different labels or thresholds?

2. **Clinical category assignment:** Should category be based on (a) systolic only, (b) diastolic only, or (c) the higher of the two categories? AHA uses the higher category — confirm this is our approach.

3. **Pulse display:** Should pulse be shown alongside BP readings, or is it a separate metric? Clinically, are there pulse values that should trigger a warning alongside BP?

4. **Disclaimers:** Do we need a medical disclaimer on the timeline view? (e.g., "This is not medical advice. Consult your physician.") What's the minimum responsible thing to show?

5. **Summary statistics:** Is showing average BP over 7 days clinically meaningful, or could it be misleading? Should we show median instead?

### For the Team

6. **Withings API rate limits:** What are the rate limits for the Withings API? Do we need to implement any throttling for the MVE? (Turk to investigate)

7. **Token expiry:** How long does a Withings access token last? Do we need refresh logic even in the hardcoded token approach? (Turk to investigate)

---

## Appendix: Project Structure (Proposed)

```
withings-assistant/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main timeline page
│   │   ├── layout.tsx                  # Root layout
│   │   └── api/
│   │       └── health/
│   │           ├── metrics/route.ts    # GET /api/health/metrics
│   │           └── types/route.ts      # GET /api/health/types
│   ├── components/
│   │   ├── LatestReading.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── Timeline.tsx
│   │   └── TimelineEntry.tsx
│   ├── hooks/
│   │   └── useHealthData.ts
│   ├── lib/
│   │   ├── types/
│   │   │   ├── metrics.ts              # HealthMetric<T>, MetricType, etc.
│   │   │   └── auth.ts                 # AuthProvider interface
│   │   ├── services/
│   │   │   └── health-data-service.ts  # Metric-agnostic orchestration
│   │   ├── adapters/
│   │   │   ├── data-source-adapter.ts  # Interface
│   │   │   └── withings-adapter.ts     # Withings implementation
│   │   ├── auth/
│   │   │   ├── auth-provider.ts        # Interface
│   │   │   └── static-token-auth.ts    # Hardcoded token implementation
│   │   ├── classification/
│   │   │   └── blood-pressure.ts       # BP category logic
│   │   └── registry/
│   │       └── metric-registry.ts      # Metric type registry
│   └── config/
│       └── metrics.ts                  # Metric type configuration
├── docs/
│   └── prd-mve.md                      # This document
├── .env.local                          # WITHINGS_ACCESS_TOKEN
├── next.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

*This is a working PRD. It will evolve as we build. Disagreements go to Cox. Medical questions go to Kelso. Everything else — build it.*
