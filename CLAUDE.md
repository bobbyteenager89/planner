# Planner — AI Group Trip Planning App

## Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Vercel deployment
- Neon Postgres (via Vercel integration) + Drizzle ORM
- Claude API (Anthropic SDK) — Sonnet for reasoning, Haiku for intake
- NextAuth v5 + Resend for magic link auth
- shadcn/ui component library
- @dnd-kit (drag-to-reorder on review page)

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:push      # Push schema to Neon
npm run db:studio    # Open Drizzle Studio
npm run db:generate  # Generate migrations
```

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handlers
│   │   ├── invite/accept/       # Invite acceptance endpoint
│   │   └── trips/               # Trip CRUD + invite API
│   │       └── [id]/
│   │           ├── og/          # OG image generation (@vercel/og, edge)
│   │           └── packing-list/ # AI packing list (Claude Haiku, cached 24h)
│   ├── dashboard/               # Trip listing (protected)
│   ├── invite/[token]/          # Invite landing page
│   ├── login/                   # Magic link auth
│   └── trips/
│       ├── [id]/                # Trip detail + invite form
│       │   ├── intake/          # Participant intake questionnaire (Phase 3)
│       │   ├── onboard/        # Owner AI onboarding chat (Phase 2)
│       │   ├── review/         # Host itinerary review (auth-gated, full reasoning)
│       │   └── share/          # Guest itinerary view (public, clean day-by-day)
│       │       ├── guide/     # Local spots guide (coffee, grocery, gear)
│       │       └── map/[day]/ # Interactive day map with stop list
│       ├── intake-demo/        # Dev-only demo page (404 in production)
│       └── new/                 # Trip creation form
├── components/ui/               # shadcn/ui components
├── db/
│   ├── index.ts                 # Neon connection (lazy)
│   └── schema.ts                # Full Drizzle schema
├── lib/
│   ├── auth.ts                  # NextAuth config
│   ├── bigsky-local-spots.ts    # Curated local spots data (16 spots)
│   └── utils.ts                 # shadcn utils
└── middleware.ts                # Auth middleware
```

## Testing
```bash
npx tsx scripts/seed-intake-test.ts    # Seed test user + trip + participant
npx tsx scripts/test-intake-action.ts  # Run intake server action integration tests
```

## Key Architecture Decisions
- **neon-http driver has NO transaction support** — use sequential idempotent writes, not `db().transaction()`
- `db()` is a function (not a constant) to avoid build-time DB connection errors
- NextAuth uses callback-based lazy config `NextAuth(() => config)` for same reason
- Conversations stored as JSONB on trip/participant records, not separate table
- Invite-first auth: participant record created with email, linked to user after magic link
- Privacy at query layer: API routes check viewer role and filter accordingly

## Environment Variables
See `.env.local.example` for required vars.

## Big Sky Trip
- **Trip ID:** `83fdfdb7-eb88-4a81-9712-0c8306854b42`
- **Survey URL:** https://planner-sooty-theta.vercel.app/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/intake
- **Guest Itinerary:** https://planner-sooty-theta.vercel.app/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/share
- **Host Review:** https://planner-sooty-theta.vercel.app/trips/83fdfdb7-eb88-4a81-9712-0c8306854b42/review
- **Public** — survey and share pages require no auth; review page is auth-gated

## Ops Doc (for Claude Cowork)
- **Download ops markdown:** `GET /api/trips/[id]/ops/doc` (auth-gated, returns attachment)
- **Cowork report-back:** `POST /api/trips/[id]/ops/update` with bearer token (hashed in `ops_tokens`)
- **Mint token:** `node scripts/mint-ops-token.mjs <trip_id> [label]` — prints raw token ONCE
- **Seed Big Sky ops:** `node scripts/seed-bigsky-ops.mjs` (idempotent)
- **Cowork brief:** `docs/COWORK.md`
- Per-block headcounts + reservation status live on `itinerary_blocks` (`adult_count`, `kid_count`, `reservation_status`, `reservation_notes`, `booking_window`). Default group = 7A+2K.

## URLs
- **GitHub:** https://github.com/bobbyteenager89/planner
- **Vercel:** https://planner-sooty-theta.vercel.app
