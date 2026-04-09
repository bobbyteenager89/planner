// Mints a new ops token for a trip. Prints raw token ONCE — store it immediately.
// Usage: node scripts/mint-ops-token.mjs <trip_id> [label]
import { neon } from '@neondatabase/serverless';
import { createHash, randomBytes } from 'crypto';

const tripId = process.argv[2];
const label = process.argv[3] ?? 'cowork';
if (!tripId) {
  console.error('Usage: node scripts/mint-ops-token.mjs <trip_id> [label]');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const raw = `ops_${randomBytes(32).toString('hex')}`;
const hash = createHash('sha256').update(raw).digest('hex');

const [row] = await sql`
  INSERT INTO ops_tokens (trip_id, token_hash, label)
  VALUES (${tripId}, ${hash}, ${label})
  RETURNING id, created_at
`;

console.log('\n✅ Token minted');
console.log('   id:        ', row.id);
console.log('   trip:      ', tripId);
console.log('   label:     ', label);
console.log('   created:   ', row.created_at);
console.log('\n🔑 RAW TOKEN (store now — will not be shown again):');
console.log('\n   ' + raw + '\n');
