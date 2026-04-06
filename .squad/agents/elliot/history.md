# Elliot — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Health data app with three views:
  1. Health timeline — interactive, user-facing data visualization
  2. LLM coaching agent interface — chat/Q&A with the health coach
  3. Doctor view — clean, clinical data presentation for medical professionals
- **Key concern:** Making blood pressure, heart rate, and ECG data visually clear for both patients and doctors

## Clinical Input from Kelso

**Blood Pressure Classification (2026-04-06):**
- Use 2017 ACC/AHA thresholds (Normal, Elevated, Stage 1, Stage 2, Crisis)
- Specific mmHg boundaries are binding for all UI display
- **Disclaimer requirement:** Single footer disclaimer on timeline: "This data is for informational purposes only. BP varies by stress, activity, posture. Consult your physician."
- **Summary stats required:** Average + Median + Range + Count for 7-day summaries (not just average)
- Clinical context matters — always show context to prevent misinterpretation

## Learnings

_No learnings yet — project just started._
