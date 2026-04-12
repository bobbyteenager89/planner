// Seeds group_config on the Big Sky trip.
// Idempotent: overwrites group_config each run.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
const TRIP_ID = "83fdfdb7-eb88-4a81-9712-0c8306854b42";

const groupConfig = {
  households: [
    { label: "Jeff & Sharon", adults: ["Jeff", "Sharon"], kids: [] },
    {
      label: "Clark & Alicia",
      adults: ["Clark", "Alicia"],
      kids: ["Andie", "Piper"],
    },
    { label: "Andrew", adults: ["Andrew"], kids: [] },
    { label: "Maddie", adults: ["Maddie"], kids: [] },
    { label: "Corban", adults: ["Corban"], kids: [] },
  ],
  totalAdults: 7,
  totalKids: 2,
};

await sql`
  UPDATE trips
  SET group_config = ${JSON.stringify(groupConfig)}::jsonb,
      updated_at = NOW()
  WHERE id = ${TRIP_ID}
`;

console.log("Seeded group_config on Big Sky trip:");
console.log(JSON.stringify(groupConfig, null, 2));
