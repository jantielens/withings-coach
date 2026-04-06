# Kelso — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Ensure health data is presented in a clinically accurate, useful way — both for end users and for doctors reviewing the data
- **Key metrics:** Blood pressure (systolic/diastolic), heart rate, ECG readings
- **Key concern:** Data without clinical context is dangerous. Every metric needs ranges, trends, and appropriate disclaimers.

## Learnings

_No learnings yet — project just started._

## Open Questions for Kelso

- Cox has 5 clinical questions about blood pressure classification:
  - What are the AHA clinical guidelines for BP classification (Normal, Elevated, Stage 1, Stage 2, Hypertensive Crisis)?
  - What are the exact systolic/diastolic thresholds for each category?
  - How should we display these categories safely to users without inducing unnecessary health anxiety?
  - Should we distinguish between home BP readings and clinical readings in our classification?
  - What disclaimers or clinical guidance should accompany BP data in the UI?
  - **Dependency:** Cox is deferring clinical classification implementation (Decision 6) pending Kelso's confirmation of thresholds

