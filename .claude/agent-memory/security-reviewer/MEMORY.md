# Security Reviewer Memory — Planner

- [project_auth_model.md](project_auth_model.md) — Auth stack: NextAuth v5 magic-link, custom middleware (not NextAuth's built-in). Cookie names to watch.
- [finding_review_route_unprotected.md](finding_review_route_unprotected.md) — P1: middleware operator precedence bug leaves /trips/[id]/review publicly accessible
- [finding_share_api_data_exposure.md](finding_share_api_data_exposure.md) — aiReasoning P2 RESOLVED (Session 6). imageUrl now in response; currently safe (seed-only writes).
- [finding_packing_list_dos.md](finding_packing_list_dos.md) — P2: public packing-list route calls Anthropic API; only CDN cache (86400s) prevents abuse, no rate limiting
