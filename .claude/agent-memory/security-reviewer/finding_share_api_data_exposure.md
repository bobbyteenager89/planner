---
name: Public share API data exposure patterns
description: P2 findings from 2026-03-27 — what the public share API exposes and what's intentional vs risky
type: project
---

**Fact:** `/api/trips/[id]/share` is fully public (no auth, no share token). It returns:
- Trip metadata (title, destination, dates, status) — intentional
- Itinerary blocks (title, description, location, cost, imageUrl) — intentional
- Participant first names + roles — low risk for a family trip, but worth noting
- Any trip by UUID (no ownership check) — UUIDs are unguessable in practice, but no explicit access control
- `aiReasoning` — intentionally included (commit f76b153, Session 7). See privacy note below.

**What it does NOT expose (good):**
- Participant emails
- inviteToken
- onboardingConversation / intakeConversation (JSONB)
- ownerId / userId
- preferences (budget, dietary, hard nos)

**aiReasoning privacy decision (Session 7, 2026-03-28):** aiReasoning is in the public API response and available via DevTools, though not rendered in the guest UI. Contains personal family preference details (e.g., "Jake wanted X but Mom said hard no"). Owner accepted this as a known tradeoff for this single-family app. If the app ever serves multiple families or external users, this should be stripped from the public endpoint.

**imageUrl:** URLs come from a seed script (not user input via API), so no injection surface today. Watch if any future API route allows writing imageUrl from user input.

**How to apply:** If the project ever moves toward stricter privacy (e.g., multiple trips, different families), the share API should add a share token, strip aiReasoning, and add separate guest/host endpoints.
