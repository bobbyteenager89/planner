# Planner — AI Group Trip Planning App

## Tech Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Vercel deployment
- Neon Postgres (via Vercel integration) + Drizzle ORM
- Claude API (Anthropic SDK) — Sonnet for reasoning, Haiku for intake
- NextAuth v5 + Resend for magic link auth
- shadcn/ui component library

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
│   ├── dashboard/               # Trip listing (protected)
│   ├── invite/[token]/          # Invite landing page
│   ├── login/                   # Magic link auth
│   └── trips/
│       ├── [id]/                # Trip detail + invite form
│       │   ├── intake/          # Participant intake questionnaire (Phase 3)
│       │   └── onboard/        # Owner AI onboarding chat (Phase 2)
│       ├── intake-demo/        # Dev-only demo page (404 in production)
│       └── new/                 # Trip creation form
├── components/ui/               # shadcn/ui components
├── db/
│   ├── index.ts                 # Neon connection (lazy)
│   └── schema.ts                # Full Drizzle schema
├── lib/
│   ├── auth.ts                  # NextAuth config
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

## URLs
- **GitHub:** https://github.com/bobbyteenager89/planner
- **Vercel:** https://planner-sooty-theta.vercel.app
