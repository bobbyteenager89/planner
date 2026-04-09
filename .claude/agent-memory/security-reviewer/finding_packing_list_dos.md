---
name: Packing-list route Anthropic API abuse / DoS risk
description: P2 finding from 2026-03-28 — public /api/trips/[id]/packing-list calls Anthropic with no rate limiting
type: project
---

**Fact:** `/api/trips/[id]/packing-list` is fully public (listed in middleware allowlist as `pathname.includes("/packing-list")`). Any caller can trigger a `claude-haiku` API call by hitting this endpoint.

**Mitigation that exists:** Response is cached with `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`. Vercel CDN will serve the cached response for subsequent requests to the same trip ID within 24h, so in practice one real Anthropic call per trip per day is expected.

**Residual risk:** The cache key is `GET /api/trips/[id]/packing-list`. An attacker enumerating UUIDs, or discovering a valid trip ID, could force one Anthropic call per unique trip ID. With a small number of trips this is negligible. If the app ever scales to thousands of trips, a targeted enumeration attack could burn meaningful API spend.

**Also note:** The route only exists for a single real trip today (Big Sky), so the practical exposure is very low.

**Why:** Logged because the pattern (public endpoint → Anthropic call → cache) is reused across other routes (insights, summary). The cache is the only protection; no IP-based rate limiting or auth is present.

**How to apply:** If future routes follow this pattern with higher token usage (e.g., full generate), flag the lack of rate limiting. For low-token endpoints with CDN caching, P2 is appropriate — not P1.
