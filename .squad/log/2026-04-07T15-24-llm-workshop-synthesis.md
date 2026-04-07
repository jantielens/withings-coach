# Design Thinking Workshop: LLM Integration Roadmap

**Date:** 2026-04-07  
**Participants:** Kelso (Medical Advisor), JD (AI Engineer), Cox (Lead Architect)  
**Output:** 4-tier roadmap for LLM-powered health coaching features

## Summary

Synthesized 24 LLM brainstorm ideas (12 clinical, 12 technical) into a **4-tier prioritized roadmap** with clear architecture.

**Key Outcomes:**

- **Foundation Layer** (API, cache, schemas, disclaimers) — prerequisite for all features
- **Tier 1 (Build Now)** — 4 features shipping in 2 weeks: Trend Narrator, Emergency Alert, Circadian Detector, Medication Correlator
- **Tier 2 (Build Next)** — PDF export, lifestyle correlation, hypotension alerts, target tracker
- **Tier 3 (Future)** — Lower-urgency clinical analysis features
- **Tier 4 (Kill)** — Conversational interface, RAG, full NLP (unsafe/over-engineered)

**Core Principle:** Code handles deterministic logic (stats, thresholds). LLM handles narrative generation. Safety first. Cache aggressively.

**Status:** Ready for implementation. No blockers.

---

**Orchestration logs:** `.squad/orchestration-log/2026-04-07T15-24-53Z-*.md`  
**Decision document:** `.squad/decisions/inbox/cox-llm-workshop-synthesis.md` (merged to decisions.md)
