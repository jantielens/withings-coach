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

