# Agent: Cox — LLM Workshop Synthesis & Roadmap (Background, Completed)

**Timestamp:** 2026-04-07T15:24:53Z  
**Status:** ✅ Completed  
**Role:** Lead Architect  
**Task:** Synthesize 24 LLM opportunities (12 clinical + 12 technical) into a prioritized roadmap

## Deliverables

### 4-Tier Roadmap

**FOUNDATION LAYER (Build First):**
- API Route `/api/llm/analyze`
- LLM Client Service (GPT-4o-mini wrapper, retry logic)
- Cache Layer (SQLite `llm_responses` table, 24h TTL)
- Structured Output Schemas (Zod validation)
- Disclaimer Injection (safety footer on all responses)
- Data Quality Guard (refuse analysis if <10 readings)

**TIER 1 — BUILD NOW (2 weeks):**
1. Smart Trend Narrator (comparative 30-day analysis)
2. Emergency Risk Alert + Triage (≥180/120 detection + LLM context)
3. Circadian Pattern Detector (morning vs. evening + non-dipping)
4. Medication Correlation Analyzer (diary parsing for med changes)

**TIER 2 — BUILD NEXT (weeks 3-6):**
- Pre-Visit Summary Report (PDF export, physician narrative)
- Lifestyle-BP Correlation Tracker (stress/exercise/caffeine links)
- Hypotension Risk Alert (low BP + symptom correlation)
- Personalized Target Tracker (goal-based coaching)

**TIER 3 — FUTURE:**
- Variability Index (BP stability scoring)
- White Coat Effect Detector (office vs. home)
- Diary Entry Intelligence Assistant (real-time suggestions)

**TIER 4 — KILL:**
- ❌ Conversational Query Interface (chatbot, too complex)
- ❌ Progressive Context Enrichment (RAG overkill for 100KB data)
- ❌ Diary Insight Extraction (safety risk, over-interpretation)

### Architecture Principles (Non-Negotiable)

1. **Code = Deterministic, LLM = Narrative** — Never delegate safety logic to LLM
2. **Cache Aggressively** — Every call costs; avoid redundant API hits
3. **Fail Gracefully** — LLM down? Show cached result or "temporarily unavailable"
4. **Safety First** — Emergency alerts, data guards, disclaimers are mandatory
5. **No RAG Until Proven Necessary** — Full context in every prompt; embeddings = overkill

### Binding Decisions

1. **Diary Parsing:** Structured events only (medication changes). No open-ended symptom interpretation (safety risk).
2. **Conversational Interface:** Killed. Single-shot analysis only.
3. **Emergency Alerts:** Hybrid. Code triggers hardcoded guidance at ≥180/120. LLM adds context but never overrides core message.

### Success Metrics

- **Engagement:** >50% of users click "Analyze Trends"
- **Safety:** 100% detection rate for hypertensive crises
- **Cost:** <$1/user/month LLM spend
- **Trust:** Physician validation of narrative quality

---

**Status:** FINAL — Ready for implementation  
**Next Step:** Start Foundation Layer this week, ship Tier 1 in 2 weeks
