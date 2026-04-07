# Diary Entry Storage Architecture — Design Recommendation

**Cox — Lead Architect**  
**Date:** 2026-04-06  
**Status:** Recommended for approval

---

## EXECUTIVE SUMMARY

Add **per-day diary entries** (free-form text notes: "took medicine ABC", "stressful day", "started cold with fever") to enrich BP trend analysis with patient context.

**RECOMMENDATION:** SQLite + simple REST API + inline UI integration. **Zero cloud costs, single-user MVP, migration path to multi-user.**

---

## 1. STORAGE RECOMMENDATION: **SQLite**

### Selected Option
**SQLite** (file-based, zero config, ships with Node)

### Rationale

| Factor | SQLite | JSON | localStorage | Better-sqlite3/Prisma | Azure Table Storage |
|--------|--------|------|--------------|----------------------|---------------------|
| **MVP Simplicity** | ✅ One file, no setup | ✅✅ Simpler file ops | ❌ Browser-only | ✅ Typed, migrations | ❌ Requires Azure |
| **Migration to Multi-user** | ✅✅ Built-in user IDs | ⚠️ Flatten JSON structure | ❌ Impossible | ✅✅ Same | ✅✅ Ready now |
| **Backup/Export** | ✅ One `.db` file | ✅✅ Trivial JSON export | ❌ Not applicable | ✅ One file | ⚠️ API calls |
| **Next.js Compatibility** | ✅✅ Native Node support | ✅ Full | ❌ SSR breaks | ✅ Full | ✅ Full |
| **Cloud Costs** | ✅✅ $0 | ✅✅ $0 | ✅✅ $0 | ✅✅ $0 | ❌ $$ per operation |
| **Query Complexity** | ✅ SQL queries | ⚠️ JSON.parse + filter | ❌ N/A | ✅ Prisma/ORM | ✅ Simple |
| **Concurrent Access** | ✅ Safe (WAL mode) | ⚠️ Race conditions | N/A | ✅ Safe | ✅ Safe |

### Why NOT the others:
- **JSON file:** Works for MVP, but multi-user JSON requires per-user files (scaling nightmare) or nested structure (query nightmare). SQLite scales linearly.
- **localStorage:** Browser-only. Can't sync to server, can't share data, can't back up. Dead end for any server feature.
- **Better-sqlite3/Prisma:** Adds complexity without benefit. SQLite + native Node `sqlite3` is sufficient. Prisma adds 50+ lines of boilerplate for a 3-table schema.
- **Azure Table Storage:** Beats SQLite on multi-user readiness but adds cloud billing and vendor lock-in. Save for Phase 2 if scaling demands it.

### Implementation: Node `sqlite3` (sync wrapper optional)

```bash
npm install sqlite3
```

Use the native Node driver. Optional: wrap with `better-sqlite3` later if performance issues emerge (they won't in MVP).

---

## 2. DATA MODEL: Minimal Entry Schema

### Core Diary Entry

```typescript
interface DiaryEntry {
  id: string;                  // UUID or "diary_{userId}_{timestamp}"
  userId: string;              // Future: multi-user support
  date: string;                // ISO 8601 date (YYYY-MM-DD) — diary is per-day
  text: string;                // Free text (max 1000 chars)
  createdAt: string;           // ISO 8601 timestamp
  updatedAt: string;           // ISO 8601 timestamp
}
```

### Why This Minimal Set:
- **No category/tags/mood/severity in MVP.** The text IS the context. Future phases can parse mood ("stressful day") from text using LLM.
- **`date` (YYYY-MM-DD), not `timestamp`.** Diary is per-day. Time-of-day doesn't matter for "took medicine ABC". Simplifies queries: `SELECT * FROM diary WHERE date = '2025-07-15'`.
- **`userId`.** Even though MVP is single-user (hardcoded or env var), add it now. Multi-user migration requires adding userId to WHERE clauses everywhere — easier to add one column now than refactor later.

### Database Schema (SQLite)

```sql
CREATE TABLE diary_entries (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD format
  text TEXT NOT NULL,
  createdAt TEXT NOT NULL,  -- ISO 8601
  updatedAt TEXT NOT NULL,  -- ISO 8601
  UNIQUE(userId, date)   -- One entry per day per user
);

CREATE INDEX idx_diary_userId_date ON diary_entries(userId, date);
```

### Why `UNIQUE(userId, date)`:
- Users can only have **one diary entry per day** (MVP constraint).
- Prevents duplicate entries for same date.
- Simplifies UI — edit existing entry or create new one, never merge.
- If future requires multiple entries per day, add a `time` column and drop UNIQUE. Schema evolution is cheap.

---

## 3. API DESIGN: Simple REST for Diary

### Routes

```typescript
// GET /api/diary?date=2025-07-15&userId=default
// Returns one entry for given date/user, or 404 if none

// POST /api/diary
// { userId: "default", date: "2025-07-15", text: "Took medicine ABC, stressful day" }
// Creates or updates entry for that date

// GET /api/diary?from=2025-07-01&to=2025-07-31&userId=default
// Returns all entries for date range (for LLM prompt)

// DELETE /api/diary?date=2025-07-15&userId=default
// Soft delete or hard delete (TBD with Jan)
```

### Integration with `/api/health/metrics`

The diary is **separate** from health metrics. They live in:
- **Health metrics:** Withings API → HealthDataService → `/api/health/metrics`
- **Diary:** Local SQLite → DiaryService → `/api/diary`

**Then:** In the prompt builder and UI, merge them by date:

```typescript
// In prompt-builder.ts, extend buildDataTable():
async function buildDataTableWithDiary(
  readings: ReadingGroup<BloodPressureData>[],
  diaryEntries: DiaryEntry[],
  dayCount: number
): string {
  // Iterate readings, look up diary entry by date
  // Table now includes: | Date | Time | SYS | DIA | Pulse | Category | Diary Note |
}
```

This keeps concerns separate (API, DB) while integrating at the presentation layer (prompt/UI).

---

## 4. UI PLACEMENT: Inline in Expanded Day Detail

### Recommended Location
**In the `DaySummary` card** (already expanded per day). Add a "Notes" section below the category distribution:

```
┌─────────────────────────────────────────────────┐
│ Tuesday, July 15, 2025                          │
├─────────────────────────────────────────────────┤
│ Category Distribution:  Grade 1 (2x), Normal (1x) │
│ Range: 135–156 / 80–89 mmHg                    │
│ 3 readings over 4 sessions                      │
├─────────────────────────────────────────────────┤
│ Notes for this day:                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ Took medicine ABC in morning, stressful day │ │
│ │ [Edit] [Delete]                             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Why This Location:
- **Natural discovery.** Users expanding a day to see details will see the input.
- **Persistent.** Not a floating modal that blocks the timeline.
- **Contextual.** Next to the BP data it annotates.
- **No new page/section.** Reuses existing `DaySummary` component.

### UI Components Needed:
1. `DiaryNoteDisplay.tsx` — Shows existing note + edit/delete buttons
2. `DiaryNoteEditor.tsx` — Inline textarea for editing/creating
3. Hook: `useDiaryEntry(userId, date)` — Fetch and update diary entry

---

## 5. PROMPT INTEGRATION: Diary in "Patient Context" Section

### Current Prompt Structure (from `buildBPPrompt`):
1. Role
2. Goal
3. Data Table (BP readings)
4. Output Format

### Proposed Extension:
```typescript
export function buildBPPrompt(
  readings: ReadingGroup<BloodPressureData>[],
  diaryEntries: DiaryEntry[],
  dayCount: number
): string {
  const sections = [
    buildRole(),
    buildGoal(dayCount),
    buildPatientContext(diaryEntries),  // NEW
    buildDataTable(readings, diaryEntries, dayCount),  // UPDATED
    buildOutputFormat(),
  ];
  return sections.join('\n\n---\n\n');
}

function buildPatientContext(diaryEntries: DiaryEntry[]): string {
  if (!diaryEntries.length) {
    return `## Patient Context\n\nNo patient notes for this period.`;
  }

  const notes = diaryEntries
    .map(e => `- ${e.date}: ${e.text}`)
    .join('\n');

  return `## Patient Context

The patient provided the following contextual notes during this period:

${notes}

Use these notes to contextualize blood pressure variations. For example:
- Stress or lifestyle changes may explain temporary elevations
- Medication changes may explain improvements
- Illness or travel may explain anomalies`;
}

function buildDataTable(
  readings: ReadingGroup<BloodPressureData>[],
  diaryEntries: DiaryEntry[],
  dayCount: number
): string {
  // Merge diary notes into the reading rows by date
  const diaryMap = new Map(diaryEntries.map(e => [e.date, e.text]));
  
  const rows = sorted.map((group) => {
    const date = group.timestamp.slice(0, 10);
    const note = diaryMap.get(date) ?? '';
    // Include note column in table
    return `| ${date} | ${time} | ${systolic} | ${diastolic} | ${pulse} | ${label} | ${notes} | ${note} |`;
  });

  // Update table header to include Notes column
  return `## Data

| Date | Time | SYS | DIA | Pulse | Category | Notes | Patient Notes |
|------|------|-----|-----|-------|----------|-------|---------------|
${rows.join('\n')}
...`;
}
```

### Why Separate "Patient Context" Section:
- **Clarity.** LLM knows this is qualitative context, not quantitative data.
- **Flexible interpretation.** LLM can decide to upweight/downweight diary notes per entry.
- **Future parsing.** Can extract mood/events via LLM or simple heuristics ("stressful" → context, "took medicine" → medication tracking).

---

## 6. MIGRATION PATH: Single-User MVP → Multi-User

### MVP (Now)
- **Single user**: hardcoded `userId = "default"` in API routes and UI.
- **No auth.** Same env var token for all.
- **Data structure ready.** `userId` column exists but unused.

```typescript
// src/app/api/diary/route.ts
const userId = process.env.DIARY_USER_ID || 'default';

// Usage in component:
const entries = await fetch(`/api/diary?userId=${userId}&date=${date}`);
```

### Phase 2 (Multi-User)
1. **Add Auth.** Use same `AuthProvider` interface as health metrics. Multi-user OAuth implementation replaces `StaticTokenAuth`.
2. **Extract userId.** From JWT or session instead of hardcoding.
3. **Add user_id WHERE clause.** Already in schema and API (no migration needed).
4. **Optional: Migrate to cloud DB.** If single-user SQLite hits performance/scaling limits, dump to Azure Table Storage. Schema stays the same.

```typescript
// Before: MVP single-user
const userId = 'default';
const diary = db.prepare('SELECT * FROM diary_entries WHERE date = ?').get(date);

// After: Multi-user, same query pattern
const userId = extractUserIdFromAuth(auth);  // OAuth token or session
const diary = db.prepare('SELECT * FROM diary_entries WHERE userId = ? AND date = ?').get(userId, date);
```

### Why This Works:
- **Zero breaking changes in MVP.** Adding `userId` to all queries is additive.
- **Storage-agnostic.** Whether SQLite or Azure, the API signature and data model don't change.
- **Auth-agnostic.** OAuth or static token, the `userId` extraction point is isolated.

---

## 7. IMPLEMENTATION CHECKLIST

### Phase 1: Core Diary (Est. 3–4 hours)

#### A. Storage Layer
- [ ] Create `src/lib/db/diary-db.ts` — SQLite init + migration
- [ ] Create table: `diary_entries` with schema above
- [ ] Add `.gitignore` entry for `.db` file and create `db/` dir

#### B. Service Layer
- [ ] Create `src/lib/services/diary-service.ts`
  - `getDiaryEntry(userId, date): Promise<DiaryEntry | null>`
  - `getAllDiaryEntries(userId, fromDate, toDate): Promise<DiaryEntry[]>`
  - `createOrUpdateEntry(userId, date, text): Promise<DiaryEntry>`
  - `deleteEntry(userId, date): Promise<void>`

#### C. API Routes
- [ ] Create `src/app/api/diary/route.ts`
  - `GET` — fetch by date or date range
  - `POST` — create/update entry
  - `DELETE` — delete entry

#### D. UI Components
- [ ] Create `src/components/DiaryNoteDisplay.tsx` — Shows entry + edit/delete buttons
- [ ] Create `src/components/DiaryNoteEditor.tsx` — Inline edit form
- [ ] Create `src/hooks/useDiaryEntry.ts` — Fetch, create, update, delete
- [ ] Update `src/components/DaySummary.tsx` — Integrate diary note display in expanded view

#### E. Tests
- [ ] Create `src/__tests__/services/diary-service.test.ts`
- [ ] Create `src/__tests__/api/diary.test.ts`
- [ ] Create `src/__tests__/components/DiaryNoteEditor.test.tsx`

### Phase 2: Prompt Integration (Est. 1–2 hours)

- [ ] Update `src/lib/llm-prompt/prompt-builder.ts`
  - Add `buildPatientContext(diaryEntries)`
  - Update `buildDataTable()` to include diary notes
- [ ] Update `src/app/api/health/metrics/route.ts` — Fetch diary entries alongside metrics
- [ ] Test: LLM prompt includes diary notes correctly

### Phase 3: Multi-User Preparation (Est. 0.5 hours)

- [ ] Verify `userId` is threaded through all API routes
- [ ] Document in `ARCHITECTURE.md` how to migrate to auth-driven userId
- [ ] No code changes needed; just documentation

---

## 8. FILE STRUCTURE

```
src/
├── lib/
│   ├── db/
│   │   └── diary-db.ts                 # SQLite init, schema, migrations
│   ├── services/
│   │   └── diary-service.ts            # CRUD business logic
│   └── llm-prompt/
│       └── prompt-builder.ts           # UPDATED: add diary integration
├── app/api/
│   └── diary/
│       └── route.ts                    # GET/POST/DELETE endpoints
├── components/
│   ├── DiaryNoteDisplay.tsx            # Readonly + edit/delete buttons
│   ├── DiaryNoteEditor.tsx             # Inline edit form
│   └── DaySummary.tsx                  # UPDATED: integrate diary display
├── hooks/
│   └── useDiaryEntry.ts                # useQuery/useMutation wrapper
└── __tests__/
    ├── services/
    │   └── diary-service.test.ts
    ├── api/
    │   └── diary.test.ts
    └── components/
        └── DiaryNoteEditor.test.tsx
```

---

## 9. EXAMPLE: DiaryEntry Types & DiaryService

### Type Definition

```typescript
// src/lib/types/diary.ts
export interface DiaryEntry {
  id: string;
  userId: string;
  date: string;  // YYYY-MM-DD
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryResponse {
  entry: DiaryEntry | null;
}

export interface DiaryListResponse {
  entries: DiaryEntry[];
}
```

### Service Implementation (sketch)

```typescript
// src/lib/services/diary-service.ts
import Database from 'sqlite3';
import { DiaryEntry } from '@/lib/types/diary';

export class DiaryService {
  private db: Database.Database;

  constructor() {
    this.db = new Database.Database('./db/diary.db');
    this.initializeSchema();
  }

  private initializeSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        date TEXT NOT NULL,
        text TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(userId, date)
      )
    `);
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_diary_userId_date ON diary_entries(userId, date)`
    );
  }

  async getEntry(userId: string, date: string): Promise<DiaryEntry | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM diary_entries WHERE userId = ? AND date = ?',
        [userId, date],
        (err, row) => {
          if (err) reject(err);
          resolve((row as DiaryEntry) || null);
        }
      );
    });
  }

  async getEntries(userId: string, from: string, to: string): Promise<DiaryEntry[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM diary_entries WHERE userId = ? AND date BETWEEN ? AND ? ORDER BY date',
        [userId, from, to],
        (err, rows) => {
          if (err) reject(err);
          resolve((rows as DiaryEntry[]) || []);
        }
      );
    });
  }

  async createOrUpdate(
    userId: string,
    date: string,
    text: string
  ): Promise<DiaryEntry> {
    const id = `diary_${userId}_${date}`;
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO diary_entries (id, userId, date, text, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(userId, date) DO UPDATE SET text = ?, updatedAt = ?`,
        [id, userId, date, text, now, now, text, now],
        (err) => {
          if (err) reject(err);
          this.getEntry(userId, date).then(resolve).catch(reject);
        }
      );
    });
  }

  async delete(userId: string, date: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM diary_entries WHERE userId = ? AND date = ?',
        [userId, date],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }
}
```

---

## 10. SUMMARY TABLE

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Storage** | SQLite | Zero config, zero cost, migration-ready, Next.js native |
| **Data Model** | `{id, userId, date, text, createdAt, updatedAt}` | Minimal, future-proof, KISS |
| **Uniqueness** | One entry per day per user | Simplifies edit logic, extensible later |
| **API** | `GET/POST/DELETE /api/diary` | REST convention, separate from health metrics |
| **UI** | Inline in `DaySummary` (expanded day) | Natural discovery, contextual, no floating modals |
| **Prompt** | Separate "Patient Context" section + inline notes in data table | LLM clarity, flexible interpretation |
| **Migration Path** | userId in all queries from day one | Zero refactoring to add auth in Phase 2 |
| **Backup** | Single `diary.db` file in `.gitignore` | Portable, versioning-friendly |

---

## 11. RECOMMENDED BUILD ORDER

1. **DiaryService + SQLite schema** — Storage works before anything touches it
2. **API routes** — Test storage layer via HTTP
3. **DiaryNoteDisplay + hook** — Read-only UI with real data
4. **DiaryNoteEditor** — Edit UI
5. **DaySummary integration** — Wire editor into day detail
6. **Prompt builder update** — LLM gets diary notes
7. **Tests** — Full coverage once all pieces work

---

**Approval Needed From:**
- **Jan:** Storage choice (SQLite ✅), single entry per day constraint
- **Kelso:** Diary note interpretation in prompt (should LLM extract mood/medication?)
- **Turk/Elliot:** API route design, React hook patterns

**Next Step:** Jan approval → assign to Turk (storage + API) + Elliot (UI + hook)

