import { config } from "dotenv";
config({ path: ".env.local" });

import { generateRationale } from "../src/lib/ai/rationale";

const tripId = process.argv[2] ?? "83fdfdb7-eb88-4a81-9712-0c8306854b42";

(async () => {
  const r = await generateRationale(tripId);
  console.log("INTRO:\n" + r.intro + "\n");
  console.log("DAYS:");
  for (const [k, v] of Object.entries(r.days)) {
    console.log("Day " + k + ": " + v + "\n");
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
