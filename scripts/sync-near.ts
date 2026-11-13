/**
 * Refresh the NEAR deployment record and demo evidence from the sibling
 * `bound` repo (branch near-hackathon). Local only; reads no secrets: the
 * copied files hold account ids and transaction hashes.
 *
 *   pnpm sync:near [path-to-bound-repo]   (default ../bound)
 */
import { copyFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const bound = resolve(process.argv[2] ?? "../bound");
const here = resolve("lib/near");

copyFileSync(
  join(bound, "near/deployments/testnet.json"),
  join(here, "testnet.json"),
);
const ev = join(bound, "near/evidence");
const runs = readdirSync(ev).filter((f) => /^near-demo-.*\.json$/.test(f));
for (const f of runs) copyFileSync(join(ev, f), join(here, "evidence", f));
console.log(
  `copied testnet.json and ${runs.length} evidence file(s) from ${bound}`,
);
console.log("new run ids must also be imported in lib/near/deployment.ts");
