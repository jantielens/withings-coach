# Turk — History

## Project Context

- **Project:** Withings Coach (withings-assistant)
- **User:** Jan Tielens
- **Stack:** Web app connecting to Withings API
- **Purpose:** Integrate with Withings API to pull health data (blood pressure, heart rate, ECG) and serve it to three consumers: web timeline, LLM agent, doctor view
- **Key concern:** Reliable Withings OAuth flow, data normalization, and efficient API design for multiple consumers

## Clinical Input from Kelso

**Blood Pressure Classification (2026-04-06):**
- BP classification uses **higher-of-two-categories** rule: when systolic and diastolic fall into different severity levels, assign the higher one
- Example: Reading 128/82 → Systolic=Elevated, Diastolic=Stage 1 → **Assigned: Stage 1**
- This rule prevents underestimating cardiovascular risk; implement in service layer classification logic

## Learnings

_No learnings yet — project just started._

## Open Questions for Turk

- Cox has 2 open questions about Withings API:
  - What are the rate limits on Withings API calls? (per endpoint, per user, per day?)
  - What is the token refresh behavior for OAuth? Do access tokens expire? How long is the refresh token valid?
  - **Dependency:** Cox is deferring caching decision (Decision 5) pending rate limit investigation

