/**
 * The NEAR testnet deployment record and the committed demo evidence.
 *
 * `testnet.json` and `evidence/*.json` are verbatim copies of
 * `bound/near/deployments/testnet.json` and `bound/near/evidence/near-demo-*.json`
 * on the bound repo's `near-hackathon` branch (refresh with
 * `pnpm sync:near`). They hold account ids and transaction hashes only, no
 * keys, so this module is safe on both sides of the server/client line.
 * Every figure the pages show is read live from the chain; these files only
 * say where to look and what the demo run claimed, so the run page can
 * re-check the claim against the chain.
 */
import record from "./testnet.json";
import runA from "./evidence/near-demo-mwfgi0ij.json";
import runB from "./evidence/near-demo-mwfgqr0u.json";

export interface DemoStep {
  act: number;
  label: string;
  signer: string;
  receiver: string;
  method: string;
  hash: string | null;
  url: string | null;
  ok: boolean;
  expectOk: boolean;
  error: string | null;
  pass: boolean;
}

export interface DemoAssert {
  act: number;
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
}

export interface DemoRun {
  runId: string;
  startedAt: string;
  finishedAt: string;
  contract: string;
  token: string;
  certId: number;
  cert2Id: number;
  harmChallengeId: number;
  actors: Record<string, string>;
  gate: Record<string, unknown>;
  steps: DemoStep[];
  asserts: DemoAssert[];
  pass: boolean;
}

export const NEAR_DEPLOYMENT = Object.freeze(record);
export const BOUND_CONTRACT = record.contracts.bound.accountId;
export const TOKEN_CONTRACT = record.contracts.token.accountId;

export const DEMO_RUNS: readonly DemoRun[] = Object.freeze([
  runB as DemoRun,
  runA as DemoRun,
]);

export function findRun(runId: string): DemoRun | null {
  return DEMO_RUNS.find((r) => r.runId === runId) ?? null;
}

/** Agents left Verified for judging (cert 2 of every committed run). */
export const SAMPLE_AGENTS = DEMO_RUNS.map((r) => ({
  verified: r.actors.agent2,
  settled: r.actors.agent,
  runId: r.runId,
}));

export const ACT_TITLES: Record<number, string> = {
  1: "Actors and play money",
  2: "Certificate published, funded and attested",
  3: "Agent confined to a function-call key; pays through the meter",
  4: "Attacks: refused by the contract or by NEAR itself",
  5: "False claim rejected in the same transaction",
  6: "Harm claim, arbiter verdict, claim window",
  7: "Settlement waterfall and victim withdrawal",
  8: "Second certificate left Verified for judging",
};
