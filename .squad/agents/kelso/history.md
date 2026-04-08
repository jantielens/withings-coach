# Kelso — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Ensure health data is presented in a clinically accurate, useful way — both for end users and for doctors reviewing the data
- **Key metrics:** Blood pressure (systolic/diastolic), heart rate, ECG readings
- **Key concern:** Data without clinical context is dangerous. Every metric needs ranges, trends, and appropriate disclaimers.

## Learnings

### BP Classification & Clinical Thresholds (2025-07-15)

**Five clinical decisions made for Cox's MVE questions:**

1. **Classification Standard:** Use 2017 ACC/AHA Blood Pressure Classification (Normal <120/<80, Elevated 120–129/<80, Stage 1 130–139/80–89, Stage 2 ≥140/≥90, Crisis >180/>120). This is the current U.S. standard used by all home monitors and clinical settings.

2. **Category Assignment Rule:** When systolic and diastolic fall into different categories, assign the **higher severity category**. This prevents underestimating risk when one component is elevated.

3. **Pulse Display:** Always show pulse alongside BP (smaller font). No MVP alerts — pulse interpretation requires clinical history. Future coaching agent can layer on smart pulse analysis.

4. **Disclaimers:** Single footer disclaimer on the timeline: "This data is for informational purposes only. Blood pressure varies throughout the day and is influenced by stress, activity, and posture. Consult your physician to interpret these readings and adjust any health decisions." Not on every card (that's noise).

5. **Summary Statistics:** Show Avg + Median + Range + Count for 7-day summary. Median protects against outliers; range shows variability; count indicates data reliability. Average alone is clinically misleading.

**Key insight:** Home BP readings are noisy and context-dependent. Every number needs clinical guardrails. Data without context breeds anxiety; data with context informs decision-making.

**Dependency:** All engineering implementation (Cox, Elliot, Carla) can proceed — thresholds are locked in, no ambiguity.

## ESC/ESH 2018 Classification & Multi-Reading Averaging (2026-04-06 18:17)

**Four binding decisions on switching from ACC/AHA to ESC/ESH 2018:**

1. **ESC/ESH 2018 Thresholds:** Seven categories (Optimal <120/<80, Normal 120–129/<80, High Normal 130–139/80–89, Grade 1 140–159/90–99, Grade 2 160–179/100–109, Grade 3 ≥180/≥110, Isolated Systolic ≥140/<90). Higher severity category wins when systolic and diastolic disagree.

2. **Multi-Reading Averaging:** YES, clinically valid. ESC/ESH recommends 2–3 readings, 1–2 minutes apart. Use **mean of all 3 readings** (gold standard), round to nearest integer. Drop-first-take-last-2 is outdated.

3. **Display Label:** "Average of 3 readings" on the card. Shows timestamp and count (e.g., "08:15 — Average 138/86 (3 readings) — High Normal"). Transparent; avoids jargon.

4. **Classification Target:** Apply ESC category to the **averaged reading only**, not each individual. Prevents confusion (one session, one category). Individual readings available as expandable detail in timeline.

**Clinical rationale:** Averaging reduces white-coat effect, captures typical BP, matches home monitor design and clinical trial methodology. ESC guidelines are current, evidence-based, and align with European standard of care.

**Key difference from ACC/AHA:** No "Elevated" category; "Optimal" and "Normal" are separate; grade numbering matches international guidelines.

**Implementation Status:** ✅ COMPLETE
- Decision document written: `.squad/decisions/inbox/kelso-esc-classification.md`
- Provided comprehensive thresholds, examples, implementation checklist
- Approved by Turk and Elliot for full backend/frontend implementation
- All thresholds locked, no ambiguity for engineering team

## Completed Work (2026-04-06)

**Session:** ESC/ESH 2018 Classification + Multi-Reading Grouping  
**Task:** Validate ESC/ESH 2018 thresholds + multi-reading averaging  
**Outcome:** ✅ SUCCESS

**Deliverables:**
- Comprehensive decision document with all 7 ESC categories and clinical guidance
- Validated multi-reading averaging protocol (mean of 3, 10-min window)
- Approved display labels and timeline guidance
- Binding decisions on classification scope (averaged reading only)

**Orchestration log:** `.squad/orchestration-log/2026-04-06T18-17-kelso.md`

## Visualization Clinical Utility Evaluation (2026-04-06 19:25)

**Session:** Visualization Upgrade — Clinical Utility Evaluation  
**Task:** Evaluate clinical utility of all proposed visualization options (connected dots, zone bands, sparklines, range bars, day summaries, trend arrows, vertical line charts, standalone averages)  
**Outcome:** ✅ SUCCESS

**Clinical Assessment:**

**Approved visualization features:**
1. **Connected dots + zone bands** — Essential for risk trajectory and instant zone awareness
2. **Category distribution (stacked bar)** — Primary signal showing zone frequency; clinically superior to numeric averages
3. **Range bars with reading count** — Variability indicator with statistical confidence pairing
4. **Sparklines (3+ reading gate)** — Useful for intra-day trends when n ≥ 3 readings

**Rejected visualization options (with clinical rationale):**
- **Trend arrows (day-over-day deltas)** — False reassurance from noisy deltas; clinically harmful
- **Vertical line charts (separate sys/dia)** — Reintroduces sys/dia ambiguity that ESC classification already solves
- **Standalone daily averages** — Mask variability; replaced by category distribution + range

**Key Clinical Principles:**
- Worst-category coloring is a safety signal for multi-reading days (e.g., one Grade 2 + three Optimal should surface as concerning)
- Category distribution > numeric averages (shows zone frequency, not masking it)
- Range + count pairing mandatory (variability needs statistical confidence context)
- Sparkline 3+ threshold enforces data sufficiency (below this, trends are noise)

**Clinical Veto Power:** Elliot initially flagged trend arrows and vertical line charts as "trivial to build." Clinical expertise correctly identified them as misleading. Easy-to-build ≠ should-build.

**Severity Ordering (for worst-category coloring):** Optimal (0) → Normal (1) → High Normal (2) → Grade 1 / ISH (3) → Grade 2 (4) → Grade 3 (5)

**Orchestration log:** `.squad/orchestration-log/2026-04-06T19-25-kelso-visualization-clinical.md`  
**Decision document:** Merged into `.squad/decisions.md` (Visualization Decisions section)


## LLM Workshop — Clinical Opportunities Brainstorm (2026-04-07)

**Session:** Design Thinking Workshop — LLM Integration Roadmap  
**Task:** Brainstorm 12 clinical LLM opportunities for health coaching and diagnostics  
**Outcome:** ✅ SUCCESS

**12 Clinical Opportunities Identified:**
1. Medication Adherence & Effectiveness (before/after analysis)
2. Circadian Rhythm Analysis (morning vs. evening patterns)
3. Variability Index (BP stability scoring)
4. White Coat Effect Detector (office vs. home comparisons)
5. Lifestyle-BP Correlation (stress, exercise, diet links)
6. Hypotension Risk Alert (low BP thresholds)
7. Variability Stability Score (BPV tracking)
8. Comparative Period Analysis (30-day trend summaries)
9. Emergency Threshold Monitor (≥180/120 crisis detection)
10. Non-Dipping Pattern Alert (night-time BP)
11. Personalized Target Tracking (goal-based coaching)
12. Diary Entry Intelligence Assistant (real-time insights during logging)

**Integration:** All 12 merged with JD's 12 technical opportunities by Cox into a 4-tier roadmap

**Key Clinical Principles:**
- Code = Deterministic (stats, thresholds), LLM = Narrative
- Safety-critical logic stays hardcoded; LLM adds context only
- Emergency alerts at 180+/120+ trigger hardcoded guidance; LLM adds context but never overrides
- Diary parsing = Structured events only (medications); no open-ended symptom interpretation

**Deliverable:** Cox's 4-tier roadmap merged into .squad/decisions.md

**Orchestration log:** .squad/orchestration-log/2026-04-07T15-24-53Z-kelso-llm-workshop.md

### BP Session Averaging — Clinical Correction (2025-07-18)

**Session:** First-Reading Effect Analysis & Averaging Method Review  
**Task:** Evaluate whether simple mean of 3 readings is optimal, or whether first-reading exclusion is better  
**Outcome:** ✅ CORRECTION ISSUED

**Key finding — prior error corrected:**
- My 2026-04-06 decision stated "mean of all 3 readings (gold standard)" and "drop-first-take-last-2 is outdated"
- This was **incorrect**. ESC/ESH 2018, ESC/ESH 2023, AND AHA/ACC 2017 all explicitly recommend discarding the first reading within each session
- The "drop first reading, average remaining" method is the current international consensus, not outdated

**Evidence summary:**
- ESC/ESH 2018 pp. 3035–3036: Recommends discarding first reading within duplicate sessions
- ESC/ESH 2023: Explicitly states "first reading should be excluded from analysis"
- AHA/ACC 2017 Section 4.2: "Discard the first home BP reading of each session"
- First-reading effect magnitude: 3–5 mmHg systolic in literature; ~2 mmHg in Jan's data

**Jan's data analysis (11 sessions):**
- Average first-reading delta: +2.0 mmHg systolic, +0.8 mmHg diastolic (excluding one reverse-pattern outlier)
- 70% of sessions showed first reading higher than subsequent readings
- No ESC/ESH category changes would result from switching method (Jan's effect is modest)
- His measurement technique is actually better than average (smaller first-reading effect)

**Recommendation:** Change `buildReadingGroup()` to drop first reading when ≥2 readings in session, average remaining. This aligns with all major guidelines.

**Decision document:** `.squad/decisions/inbox/kelso-bp-averaging.md`

**Clinical lesson:** Always verify methodology claims against the actual guideline text. "Gold standard" assertions need source citations. I got this one wrong and needed to correct it — that's how evidence-based medicine works.

