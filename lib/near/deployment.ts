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
import { EVIDENCE } from "./evidence";

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
  /** Ran against an earlier, superseded Bound contract: its
   *  hashes still check out, but its certificate ids are not on the current
   *  contract. */
  superseded?: boolean;
}

export const NEAR_DEPLOYMENT = Object.freeze(record);
export const BOUND_CONTRACT = record.contracts.bound.accountId;
export const TOKEN_CONTRACT = record.contracts.token.accountId;

const mark = (r: DemoRun): DemoRun => ({
  ...r,
  superseded: r.contract !== BOUND_CONTRACT,
});

/** Newest first: the current contract's runs, then superseded ones. */
export const DEMO_RUNS: readonly DemoRun[] = Object.freeze(
  (EVIDENCE as DemoRun[])
    .map(mark)
    .sort(
      (a, b) =>
        Number(a.superseded) - Number(b.superseded) ||
        b.startedAt.localeCompare(a.startedAt),
    ),
);

/** The contract a superseded run ran against, by its account id. */
export function supersededLabel(r: DemoRun): string {
  const prev = record.previous.find((p) => p.accountId === r.contract);
  return prev ? prev.accountId.split(".")[0] : r.contract;
}

/** Why each superseded contract was replaced, in page prose. */
const SUPERSEDED_WHY: Record<string, string> = {
  "bound-v1": "a certificate-id aliasing bug, fixed in bound-v2",
  "bound-v2":
    "it ran the code from before the second review's fixes, see DESIGN.md section 10",
};

/** Why the contract a superseded run used was replaced. */
export function supersededReason(r: DemoRun): string {
  const prev = record.previous.find((p) => p.accountId === r.contract);
  return (
    SUPERSEDED_WHY[supersededLabel(r)] ??
    prev?.reason ??
    "an earlier version of the contract"
  );
}

/** Runs on the current contract (their certificate ids are live). */
export const CURRENT_RUNS = DEMO_RUNS.filter((r) => !r.superseded);

export function findRun(runId: string): DemoRun | null {
  return DEMO_RUNS.find((r) => r.runId === runId) ?? null;
}

/** Agents left Verified for judging (cert 2 of every committed run). */
export const SAMPLE_AGENTS = CURRENT_RUNS.map((r) => ({
  verified: r.actors.agent2,
  settled: r.actors.agent,
  runId: r.runId,
}));

export const ACT_TITLES: Record<number, string> = {
  1: "Actors and play money",
  2: "Certificate published, funded and attested",
  3: "Agent confined to a function-call key; pays through the meter",
  4: "Scripted attack: what a hijacked agent's key can try, refused by the contract or by NEAR itself",
  5: "False trustless claim rejected in the same transaction",
  6: "Harm claim, arbiter verdict, claim window",
  7: "Settlement waterfall and victim withdrawal",
  8: "Second certificate left Verified for judging",
};
