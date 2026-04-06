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

## Open Questions for Kelso

- Cox has 5 clinical questions about blood pressure classification:
  - What are the AHA clinical guidelines for BP classification (Normal, Elevated, Stage 1, Stage 2, Hypertensive Crisis)?
  - What are the exact systolic/diastolic thresholds for each category?
  - How should we display these categories safely to users without inducing unnecessary health anxiety?
  - Should we distinguish between home BP readings and clinical readings in our classification?
  - What disclaimers or clinical guidance should accompany BP data in the UI?
  - **Dependency:** Cox is deferring clinical classification implementation (Decision 6) pending Kelso's confirmation of thresholds

