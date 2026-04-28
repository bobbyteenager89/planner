// Session 14 — Add block_rsvps table for per-block per-person RSVPs.
// Idempotent: safe to re-run.
//
// Run: node scripts/migrate-add-block-rsvps.mjs

import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

console.log("== Creating rsvp_status enum ==");
await sql`
  DO $$ BEGIN
    CREATE TYPE rsvp_status AS ENUM ('yes', 'maybe', 'no');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$
`;
console.log("  ✓ enum ready");

console.log("\n== Creating block_rsvps table ==");
await sql`
  CREATE TABLE IF NOT EXISTS block_rsvps (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    block_id        uuid NOT NULL REFERENCES itinerary_blocks(id) ON DELETE CASCADE,
    participant_id  uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    status          rsvp_status NOT NULL,
    created_at      timestamp NOT NULL DEFAULT now(),
    updated_at      timestamp NOT NULL DEFAULT now()
  )
`;
console.log("  ✓ table ready");

console.log("\n== Creating indexes ==");
await sql`CREATE INDEX IF NOT EXISTS block_rsvps_trip_id_idx ON block_rsvps(trip_id)`;
await sql`CREATE INDEX IF NOT EXISTS block_rsvps_block_id_idx ON block_rsvps(block_id)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS block_rsvps_block_participant_idx ON block_rsvps(block_id, participant_id)`;
console.log("  ✓ indexes ready");

console.log("\n== Verify ==");
const cols = await sql`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'block_rsvps' ORDER BY ordinal_position
`;
console.log(cols.map((c) => `  ${c.column_name}: ${c.data_type}`).join("\n"));

console.log("\n✓ Migration complete.");
