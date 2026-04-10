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

### 2025-07-15 — Visualization Plan Synthesized

- **Clinical veto power works.** Kelso rejected three of Jan's original ideas (trend arrows, vertical line charts, standalone averages) with clear clinical reasoning. Letting the domain expert kill features early saved 3-4 hours of wasted UI work and avoided shipping something misleading.
- **Zero-dependency UI is the right call for this project.** Elliot confirmed every visualization we need is achievable with Tailwind + inline SVG. Charting libraries (D3, Chart.js, Recharts) add bundle weight, learning curve, and accessibility debt for features we won't use. This only works because our chart types are simple — revisit if we ever need interactive zooming or complex annotations.
- **Synthesizing specialist inputs requires active filtering, not just merging.** Kelso and Elliot independently converged on the same build order, which is a strong signal. Where they diverged (Elliot listed trend arrows as trivial to build; Kelso flagged them as clinically harmful), the clinical perspective correctly overrides the feasibility perspective. Easy-to-build ≠ should-build.
- **Category distribution > numeric averages for BP summaries.** This was Kelso's strongest recommendation and it aligns with ESC guidelines. Averages mask the thing doctors care about most: how often readings land in dangerous zones. This principle should carry forward to any future metric summaries (HR zones, etc.).

## Visualization Synthesis (2026-04-06 19:25)

**Session:** Visualization Upgrade — Team Synthesis  
**Task:** Synthesize Kelso clinical guidance + Elliot feasibility analysis into prioritized build plan  
**Outcome:** ✅ SUCCESS

**Synthesis Process:**
- Inputs: Kelso (clinical utility ranking), Elliot (feasibility assessment + effort estimates), Jan (original feature requests)
- Output: Prioritized 5-item build list with technical approach, effort estimates, and trade-off rationale

**Prioritized Build List:**
1. Connected Dot Timeline (Tier 1 day dots + Tier 2 reading dots) — 1–2 hours
2. ESC Color-Coded Zone Bands — ~1 hour
3. Day Summary Cards (Category Distribution + Range + Count) — 2–3 hours
4. Sparklines (3+ reading gate) — 1–2 hours
5. Range Bars — 1 hour
**Total:** 6–9 hours

**Technical Approach:** Pure Tailwind CSS + hand-rolled inline SVG, zero new dependencies

**Items Cut & Clinical Rationale:**
- **Daily trend arrows** — Kelso clinical veto (false reassurance from noisy day-over-day deltas)
- **Vertical line charts (sys/dia separate)** — Kelso clinical veto (reintroduces solved ambiguity)
- **Standalone daily averages** — Kelso veto (masks variability; replaced by category distribution + range)

**Default View:** 4-week timeline with connected dots (colored by worst ESC category), zone bands (background), expandable day cards (category distribution + range + count)

**Key Decisions Documented:**
- Worst-category coloring for multi-reading safety
- Category distribution as primary signal
- Fixed 80–200 mmHg range bar scale
- Sparkline 3+ reading threshold
- DaySummary as composite orchestrator
- ZoneLegend in Timeline header

**Orchestration log:** `.squad/orchestration-log/2026-04-06T19-25-cox-visualization-synthesis.md`  
**Decision document:** Merged into `.squad/decisions.md` (Visualization Decisions section)

### 2025-01-27 — LLM Integration Workshop Synthesis

**Session:** LLM Integration Strategy — Design Thinking Output Consolidation  
**Task:** Synthesize 24 LLM integration ideas (12 clinical from Kelso + 12 technical from JD) into actionable roadmap  
**Outcome:** ✅ SUCCESS

**Core Pattern Established:**
- **Code handles deterministic logic** (stats, thresholds, categorization)
- **LLM handles narrative generation** (explanations, correlations, triage context)
- **Cache aggressively** (SQLite-backed prompt hash caching, 24hr TTL)
- **Fail gracefully** (LLM down ≠ app broken)

**Merged Overlapping Ideas:**
- Circadian analysis (Kelso #3 + JD #3) → Time-of-day pattern detector with hybrid code/LLM approach
- Medication correlation (Kelso #2, #10 + JD #6) → Before/after segmentation + diary parsing
- Emergency alerts (Kelso #9 + JD #5) → Threshold detection + LLM contextual triage
- Trend summary (Kelso #8 + JD #1) → Comparative period analysis with narrative
- Pre-visit report (Kelso #1 + JD #8) → PDF export (deferred to Tier 2)

**Foundation Layer (Build First):**
1. API route `/api/llm/analyze` — POST handler with rate limiting
2. LLM client service — OpenAI GPT-4o-mini wrapper with retry logic
3. Cache layer — SQLite `llm_responses` table with hash-based invalidation
4. Structured output schemas — Zod validation for JSON mode responses
5. Disclaimer injection — Auto-append safety warnings to all outputs
6. Data quality guard — Refuse analysis if <10 readings in time window

**Tier 1 (Build Now — 2 Weeks):**
1. **Smart Trend Narrator** — One-click 30-day summary with previous period comparison ($1/month)
2. **Emergency Risk Alert** — Hypertensive crisis detection (≥180/≥120) with LLM triage ($0.15/month)
3. **Circadian Pattern Detector** — Morning/evening BP patterns with clinical interpretation ($0.40/month)
4. **Medication Correlation Analyzer** — Before/after analysis for med changes with diary parsing ($0.30/month)

**Total Tier 1 Cost:** $2-5/month single user, ~$90/month for 100 users (with 50% cache hit rate)

**Tier 2 (Build Next):** Pre-visit PDF export, lifestyle-BP correlation, hypotension alerts, personalized targets

**Tier 3 (Future):** Variability index, white coat detector, diary assistant, clinical explainer

**Tier 4 (KILL):**
- ❌ **Conversational query interface** — ChatGPT cosplay, zero MVP fit
- ❌ **Progressive context enrichment (RAG)** — Embeddings overkill for 100KB data
- ❌ **Full diary NLP** — Over-interpretation risk, unsafe symptom inference

**Binding Decisions Made:**
1. **Targeted diary parsing only** — Extract medication events (safe), no open-ended symptom inference (unsafe)
2. **No conversational UI** — Single-shot analysis only, not building a chatbot
3. **Hybrid emergency alerts** — Code triggers at threshold with hardcoded guidance, LLM adds context but never overrides

**Architecture Fit:**
- ✅ Reuses existing `HealthMetric<BPReading>` pattern — zero new core abstractions
- ✅ Fits current `BPMetrics` class for stats computation
- ✅ Integrates with existing diary system
- ⚠️ Requires one new table: `medication_events` (links diary → extracted metadata)

**Implementation Sequence:** Foundation (Week 1) → Trend + Alerts (Week 2) → Circadian (Week 3) → Medication (Week 4)

**Decision document:** `.squad/decisions/inbox/cox-llm-workshop-synthesis.md`

**Key Learning:** When synthesizing specialist outputs (clinical × technical), use scoring matrix (Clinical Value × Technical Feasibility × Strategic Fit) to force explicit trade-off reasoning. Features that score high on only one dimension get deferred or killed. All Tier 1 features scored high on all three axes.

### 2025-07-18 — Chatbot Architecture Decision

**Session:** Integrated chatbot/coaching agent architecture recommendation  
**Task:** Evaluate context-in-prompt vs RAG vs hybrid for a new chat feature; design full system architecture  
**Outcome:** ✅ Architecture decision document delivered

**Key Decisions:**
1. **Context-in-prompt wins over RAG.** 1 year of BP data ≈ 15K tokens — fits easily in GPT-4o's 128K window. RAG would add 3+ Azure resources (AI Search, vector index, embedding model) for zero benefit at current data volumes. Revisit threshold: when total context exceeds ~80K tokens.
2. **Minimal Azure resources:** Only 3 needed — AI Foundry (hub + project + GPT-4o deployment) + App Service. No search, no vector DB, no Redis.
3. **Managed identity auth via `DefaultAzureCredential`** — local dev uses `az login`, production uses system-assigned managed identity on App Service. Biggest risk: must spike this first to validate it works with `@azure/openai` in Next.js server.
4. **Single API endpoint:** `POST /api/chat` returning SSE stream. No server-side chat history (state lives in React client). Server builds full context on every request from existing services.
5. **Reversed two prior kill decisions** — "Conversational query interface" and "RAG" were killed in LLM Workshop. Chat is now explicitly requested by Jan; RAG remains killed on technical merit (data volume too small).
6. **3-week implementation timeline:** Week 1 = auth spike + foundation, Week 2 = chat API + UI, Week 3 = polish + deploy.

**Architecture Pattern:** Server-side context assembly. The `/api/chat` route fetches health data, diary, and context notes from existing services, builds a system message with all data inline, then streams the Azure OpenAI response back. Reuses `HealthDataService`, `DiaryService`, `ContextService`, and the existing `prompt-builder.ts` logic.

**Key Files:**
- Decision doc: `.squad/decisions/inbox/cox-chatbot-architecture.md`
- Existing prompt builder to refactor: `src/lib/llm-prompt/prompt-builder.ts`
- New files needed: `src/app/api/chat/route.ts`, `src/hooks/useChat.ts`, `src/components/ChatPanel.tsx`
- Azure client wrapper: `src/lib/llm/azure-openai-client.ts` (new)

**Key Learning:** Prior kill decisions should be reviewed when user requirements change, but the technical reasoning must be re-evaluated independently. RAG was killed because "embeddings overkill for 100KB data" — that reasoning still holds even though the chatbot UX is now desired. Don't conflate "we want a chat UI" with "we need RAG infrastructure."


## 2026-04-08 — Chatbot Architecture Alignment

**Session:** Architecture Alignment Spike (Cox, Elliot, JD, Turk)  
**Output:** `.squad/decisions/inbox/cox-chatbot-architecture.md`

### Decisions Made

- **Context-in-Prompt** — BP data (~15K tokens/year) fits in 128K context window. No RAG, no vector DB. Decided after token math: 1 year ≈ 15% of window.
- **3 Azure Resources** — AI Foundry hub + project + deployment. App Service for hosting. No search, no Redis, no embedding pipeline.
- **Managed Identity Auth** — DefaultAzureCredential. Local: `az login`. Prod: system-assigned identity on App Service.
- **Single API** — `POST /api/chat` returning SSE stream. No server-side chat history.
- **System Prompt** — Refactor `buildBPPrompt()` into `buildChatSystemMessage()`. Add conversational instructions, date awareness.
- **Timeline** — 3 weeks to MVP. Week 1 spike managed identity, Week 2–3 implementation + deploy.
- **Risk** — Managed identity auth is the blocker. Week 1 spike with `/api/test-llm` proof-of-concept. Fallback to API key if needed.

### Team Handoffs

- **Elliot:** UI library research + split-pane layout (complete)
- **JD:** LLM patterns + conversational prompt design (complete)
- **Turk:** Azure backend + Vercel AI SDK integration (complete)

### Status

✅ Architecture locked. Ready for team approval and Week 1 implementation kickoff.

### 2025-07-18 — Chatbot Implementation Code Review

**Session:** Post-implementation code review of full chatbot feature (6 implementation files, 3 test files)  
**Output:** `.squad/decisions/inbox/cox-chat-review.md`

**Findings:**
- **2 critical bugs in route.ts** — (1) `toTextStreamResponse()` used but `useChat()` defaults to `DefaultChatTransport` which expects UI message stream format; must use `toUIMessageStreamResponse()`. (2) Route passes `UIMessage[]` (with `parts`) to `streamText` which expects `ModelMessage[]` (with `content`); must use `convertToModelMessages()` to convert.
- **5 medium issues** — no `maxTokens`/`temperature` on streamText, no message count guard, fragile error classification via string matching, no API route test.
- **Everything else is solid** — architecture alignment is faithful (context-in-prompt, single endpoint, managed identity, split-pane UI). Time range detection is well-tested. System prompt is well-structured with safety disclaimers. Chat UI handles all states correctly.

**Key Learning:** Always verify the actual wire protocol between client and server when using framework abstractions. The Vercel AI SDK v6 changed from `toDataStreamResponse()` to `toUIMessageStreamResponse()` and from simple `{ role, content }` messages to `UIMessage` with `parts`. Type casts (`as Array<{ role, content }>`) hide these mismatches at compile time but crash at runtime. When reviewing streaming integrations, trace the actual bytes: what the client sends, what the server receives, what format the response uses. TypeScript types are documentation, not runtime guarantees.

### 2025-07-21 — Timezone Offset Diagnosis

**Session:** Diagnose 2-hour offset in chat vs. dashboard  
**Task:** Confirm root cause, assess date boundary risk, recommend fix  
**Outcome:** ✅ Diagnosis confirmed, decision document written

**Root Cause:** Chat prompt uses `toISOString()` (UTC) for date/time formatting while dashboard UI uses `toLocaleTimeString()` (browser local). For CET/CEST users, this creates a consistent 1–2 hour offset where the LLM references readings at the wrong time.

**Secondary Bug Found:** `Timeline.tsx:174` uses `timestamp.slice(0,10)` (UTC) for diary lookup but `getDayKey()` uses local-time methods — readings near midnight could get mismatched diary entries.

**Date Boundary Risk:** Confirmed real. Readings between 00:00–01:59 CEST map to previous day in UTC, causing potential date misattribution in the chat prompt.

**Recommendation:** Option A — pass browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) from client → API → prompt builder. Format all times in user's local timezone. No new dependencies needed. Estimated 2–3 hours.

**Decision document:** `.squad/decisions/inbox/cox-timezone-offset.md`

**Key Learning:** When a system stores timestamps in UTC (correct) but has multiple rendering paths (UI components vs. server-side prompt building), every rendering path must agree on how to convert to display time. The moment one path uses `toISOString()` and another uses `toLocaleTimeString()`, you get a timezone split. This is especially dangerous in health apps where the LLM's time references must match what the user saw on their dashboard — otherwise trust erodes fast.
