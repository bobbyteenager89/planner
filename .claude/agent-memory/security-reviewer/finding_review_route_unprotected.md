---
name: Review route middleware operator precedence bug
description: P1 finding from 2026-03-27 — operator precedence in middleware allows /trips/[id]/review to bypass auth
type: project
---

**Fact:** In `src/middleware.ts`, the public-route check uses a bare `&&` without wrapping in parentheses on line 16–17:

```ts
pathname.startsWith("/api/trips/") && pathname.includes("/share") ||
pathname.startsWith("/_next")
```

Due to JS operator precedence (`&&` binds tighter than `||`), this line evaluates as:
`(startsWith("/api/trips/") && includes("/share")) || startsWith("/_next")`

That is correct for the API route. However, the intent documented in the spec was for `/trips/[id]/review` to fall through to auth naturally (not be in the allowlist). The current code does correctly NOT allowlist `/review`. But this is a fragile setup — the comment in the spec says "it already falls through to auth by default since it's not in the public allowlist," which is true today but the `&&`/`||` precedence issue means any future edit to that block risks accidentally opening review.

**Status:** Fixed or needs fix — verify current middleware on each review.

**Why:** Logged because operator precedence bugs in allowlist logic are easy to introduce and hard to spot in diff review.

**How to apply:** On any middleware diff, mentally re-parse all `&&`/`||` chains without relying on line breaks. Flag any allowlist condition that isn't wrapped in explicit parentheses.
