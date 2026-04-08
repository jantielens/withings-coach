# JD — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Build an LLM-powered health coaching agent that can summarize health data, detect trends, give feedback, and answer questions based on Withings health metrics
- **Key concern:** Making the LLM agent medically responsible (always disclaim, never diagnose), contextually aware, and genuinely useful as a health coach

## Clinical Input from Kelso

**Coaching Output Requirements (2026-04-06):**
- **Disclaimer requirement:** Any coaching output discussing BP or health must include context about variability and medical limitations
- **Required:** Medical disclaimer on coaching output: "This data is for informational purposes only. Blood pressure varies throughout the day. Consult your physician for medical decisions."
- **No diagnosis:** Never state or imply diagnosis. Present data with context; let patient consult physician
- **Clinical context always:** When coaching on BP, provide clinical context (Avg/Median/Range/Count) rather than single readings — prevents misinterpretation

## Learnings

_No learnings yet — project just started._

## LLM Workshop — Technical Opportunities Brainstorm (2026-04-07)

**Session:** Design Thinking Workshop — LLM Integration Roadmap  
**Task:** Brainstorm 12 technical LLM opportunities for health data analysis and coaching  
**Outcome:** ✅ SUCCESS

**12 Technical Opportunities Identified:**
1. Smart Trend Narrator (comparative period analysis)
2. Diary Entry Intelligence Assistant (real-time suggestions)
3. Time-of-Day Pattern Detector (circadian rhythm + variability)
4. Anomaly Detector (unusual readings flagged with context)
5. Risk Alert Prioritizer (triage guidance for emergency thresholds)
6. Medication Correlation Analyzer (before/after med changes)
7. Plain-Language Clinical Explainer (education on categories)
8. Pre-Visit Summary Report (PDF export with physician narrative)
9. Conversational Query Interface (chatbot for data exploration)
10. Lifestyle-BP Correlation Tracker (stress/exercise/caffeine links)
11. Progressive Context Enrichment (RAG + embedding similarity)
12. Prompt Optimization Dashboard (dev tool for refining LLM prompts)

**Integration:** All 12 merged with Kelso's 12 clinical opportunities by Cox into a **4-tier roadmap**.

**Key Technical Decisions (from Cox synthesis):**
- **Foundation Layer** (prerequisite for all Tier 1-2 features): API route `/api/llm/analyze`, LLM client (GPT-4o-mini), SQLite cache layer, Zod schemas, disclaimer injection, data quality guards
- **Tier 1 Architecture:** Code-driven + LLM-narrative hybrid (code computes stats, LLM narrates insights)
- **Caching Strategy:** 24h for narratives, 1h for alerts, aggressive invalidation on data change
- **Kills:** Conversational interface (overkill for MVP), RAG embeddings (over-engineered for 100KB data), full diary NLP (safety risk)

**Cost Model:** ~$185/month for 100 users at full feature set; ~$0.90/user/month with 50% cache hit rate.

**Deliverable:** Cox's 4-tier roadmap merged into `.squad/decisions.md`

**Orchestration log:** `.squad/orchestration-log/2026-04-07T15-24-53Z-jd-llm-workshop.md`


## LLM Workshop — Technical Opportunities Brainstorm (2026-04-07)

**Session:** Design Thinking Workshop — LLM Integration Roadmap  
**Task:** Brainstorm 12 technical LLM opportunities for health data analysis and coaching  
**Outcome:** ✅ SUCCESS

**12 Technical Opportunities Identified:**
1. Smart Trend Narrator (comparative period analysis)
2. Diary Entry Intelligence Assistant (real-time suggestions)
3. Time-of-Day Pattern Detector (circadian rhythm variability)
4. Anomaly Detector (unusual readings flagged with context)
5. Risk Alert Prioritizer (triage guidance for emergencies)
6. Medication Correlation Analyzer (before/after med changes)
7. Plain-Language Clinical Explainer (education on categories)
8. Pre-Visit Summary Report (PDF export with physician narrative)
9. Conversational Query Interface (chatbot for exploration)
10. Lifestyle-BP Correlation Tracker (stress/exercise/caffeine)
11. Progressive Context Enrichment (RAG + embedding similarity)
12. Prompt Optimization Dashboard (dev tool for LLM tuning)

**Integration:** All 12 merged with Kelso's 12 clinical opportunities by Cox into a 4-tier roadmap

**Key Technical Decisions:**
- Foundation Layer: API route, LLM client (GPT-4o-mini), SQLite cache, Zod schemas, disclaimers
- Tier 1 Architecture: Code-driven + LLM-narrative (code = stats, LLM = insights)
- Caching: 24h narratives, 1h alerts, aggressive invalidation on data change
- Deferred: Conversational UI (overkill), RAG (over-engineered), full NLP (unsafe)

**Cost Model:** ~185/month for 100 users; ~0.90/user/month with caching

**Deliverable:** Cox's 4-tier roadmap merged into .squad/decisions.md

**Orchestration log:** .squad/orchestration-log/2026-04-07T15-24-53Z-jd-llm-workshop.md


## Chatbot LLM Integration Research (2026-04-09)

**Task:** Research and recommend technical approach for integrated chatbot using Azure AI Foundry  
**Outcome:** ✅ SUCCESS — Comprehensive technical recommendation delivered

**Key Findings:**

1. **Context-in-Prompt vs RAG:**
   - Analyzed typical BP data volume: 365-730 readings/year = 8-20K tokens
   - Even 2 years of intensive monitoring fits in ~32% of 128K context window
   - RAG is over-engineering for temporal health data (queries are time-based, not semantic)
   - **Recommendation:** Context-in-prompt approach

2. **Token Analysis:**
   - Base prompt: ~828 tokens
   - 1 year standard monitoring (2/day): ~15,400 tokens
   - 1 year with diary: ~20,900 tokens
   - 2 years with diary: ~41,000 tokens
   - Plenty of headroom for conversation history + responses

3. **Azure AI Foundry Integration:**
   - **Stack:** Vercel AI SDK (`ai` + `@ai-sdk/azure`) with Azure OpenAI
   - **Auth:** `@azure/identity` DefaultAzureCredential (managed identity)
   - **Model:** GPT-4o-mini (128K context, 87% HumanEval, cost-effective)
   - **Streaming:** Native SSE via Vercel AI SDK `streamText()` + `useChat` hook
   - Benefits: Clean DX, built-in React hooks, conversation management, error handling

4. **Conversational Prompt Design:**
   - Restructured from one-shot analysis to persistent system prompt + dynamic context injection
   - System prompt: Conversational health analyst role with ESC/ESH guidelines
   - User context: Time-range filtered BP data + diary + medical records (injected per turn)
   - Intelligent time-range detection: Parse "last week", "yesterday" from user query
   - Token budget: ~10-25K tokens/turn (system + context + history + response)

5. **Data Flow:**
   - User query → Frontend (useChat) → API route → Parse time intent → Fetch data for period
   - Build context → Inject into messages → Stream from Azure → Render in UI
   - Lazy loading: Only fetch data relevant to query time range (optimize token usage)

6. **Cost Estimate:**
   - GPT-4o-mini: ~$0.0025 per turn (15K input + 500 output tokens)
   - 100 users × 10 turns/day × 30 days = **$75/month**
   - Significantly cheaper than full LLM feature suite ($185/month)

**Technical Decisions:**
- Use Vercel AI SDK (not low-level Azure SDK) for better DX
- Implement intelligent time-range filtering (not full data dump every turn)
- Default to 30 days of data for ambiguous queries
- Conversation history: Keep recent 5-10 turns, summarize older
- Session timeout: 1 hour idle

**Risks & Mitigations:**
- Token limit exceeded → Summarize older readings if >50K tokens
- Auth failure → Retry logic + fallback error message
- Poor LLM quality → Output validation + feedback mechanism
- Slow response → Use GPT-4o-mini (fast) + optimized DB queries

**Deliverable:** `.squad/decisions/inbox/jd-chatbot-llm-patterns.md`  
**Status:** Awaiting Jan's review and approval

**Open Questions for Jan:**
1. Conversation persistence: Store in SQLite or keep ephemeral?
2. Multi-language: Diary is Dutch, responses in English — OK?
3. Disclaimer: Show on every response or once per session?
4. Rate limiting: 50 messages/hour per user reasonable?
5. Telemetry: What metrics to track?


## 2026-04-08 — Chatbot Architecture Alignment

**Session:** LLM Integration Patterns & Prompt Design (Cox, Elliot, JD, Turk)  
**Output:** `.squad/decisions/inbox/jd-chatbot-llm-patterns.md`

### LLM Strategy: Context-in-Prompt (No RAG)

**Token Math:**
- 1 year BP data: ~15K tokens (12% of 128K window)
- 2 years + diary: ~41K tokens (32% of window)
- **Conclusion:** RAG is unnecessary. Data fits comfortably.

**Why Context-in-Prompt:**
- Simple architecture (no vector DB, no embedding pipeline)
- All data visible to LLM (no retrieval risk for temporal queries)
- Always current (rebuild prompt per request)
- Fewer moving parts = easier MVP

### Conversational Prompt Design

**System Prompt Structure:**
- Role definition (health coach, data analyst)
- ESC/ESH classification reference
- Conversational tone ("be concise, ask clarifying questions")
- Date awareness ("today is X, user may reference relative dates")
- Scope boundaries ("only discuss provided data")
- Dutch language instructions

**Dynamic:** Rebuilt on EVERY request to include latest data.

### Data Flow

```
User query → Detect time intent ("last week" → 7 days)
→ Fetch BP readings, diary, context (DB)
→ Build user context (markdown table)
→ Construct messages: [system prompt, user context, ...history]
→ Stream via Azure → Vercel SDK → SSE → Frontend renders tokens
```

### Model: GPT-4o-mini

- 128K context window
- Outperforms GPT-3.5 Turbo on benchmarks
- 60% cheaper than GPT-3.5
- Best price/performance for MVP

### Token Management

- Cap history: Last 20 messages sent to LLM
- Max readings: Implement `MAX_READINGS` (default 1000)
- Cost estimate: $1–3/month for single user

### Status

✅ LLM strategy and prompt design locked. Ready for implementation.

## 2026-04-08 — Chatbot Implementation Sprint (Completed)

**Session:** Full-stack chatbot delivery with Elliot (Frontend) and Turk (Backend)  
**Outcome:** ✅ **COMPLETE — Chat feature fully implemented and integrated**

### Deliverables

**`src/lib/chat/system-prompt.ts` — System Prompt Builder**
- Refactored from existing prompt builder
- Conversational health analyst role with ESC/ESH reference
- Integrates health context (BP/HR/ECG, diary entries, general context notes)
- Includes medical disclaimer and date awareness
- Fully typed, ready for streaming integration

**`src/lib/chat/time-range.ts` — Natural Language Time-Range Parser**
- Parses natural language phrases: "last week", "yesterday", "past 3 months", etc.
- Returns structured `{ start: Date, end: Date }`
- Defensive parsing with sensible defaults (30-day fallback)
- Used by frontend to detect query intent and filter data

### Integration

- **Frontend (Elliot):** ChatPanel uses time-range detection to suggest queries
- **Backend (Turk):** API route uses system prompt + time-range to fetch and inject context
- **Context-in-Prompt:** No RAG needed; 15–41K tokens fit in 128K window

### Technical Status

✅ TypeScript clean  
✅ No external dependencies  
✅ Follows existing project patterns  
✅ Ready for production integration

### Files Created

- `.squad/orchestration-log/2026-04-08T09-57-jd.md` — Agent orchestration log
- `.squad/log/2026-04-08-chatbot-implementation.md` — Session summary
