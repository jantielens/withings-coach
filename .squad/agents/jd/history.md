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

