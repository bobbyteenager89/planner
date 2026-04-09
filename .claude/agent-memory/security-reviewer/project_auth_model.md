---
name: Planner auth model
description: Auth stack details for the planner project — important context for every security review
type: project
---

NextAuth v5 (authjs) with magic-link email via Resend. Custom hand-rolled middleware in `src/middleware.ts` — NOT using NextAuth's built-in middleware wrapper (`auth` export). This means:

- Auth check is done by reading raw cookie values (`__Secure-authjs.session-token` / `authjs.session-token`)
- Cookie presence is used as a proxy for valid session — no cryptographic verification in middleware
- Public route allowlist is maintained manually in middleware

**Why:** The project chose custom middleware rather than NextAuth's `auth()` wrapper, likely to avoid build-time DB connection issues (same reason `db()` is a lazy function).

**How to apply:** When reviewing middleware changes, check the allowlist logic carefully. The cookie-presence check is weaker than a full session validation — treat it as "first line of defense, not the only line."
