/**
 * SERVER ONLY. Every NEAR chain fact the `/app/near` pages render.
 *
 * Same rule as `lib/bound.ts`: a failed read degrades to `null`, never to
 * zero or "no certificate". Each read is caught on its own so one slow node
 * cannot blank the whole page, and the UI says "could not be read" rather
 * than inventing an answer.
 */
import {
  confinement,
  type ChallengeView,
  type CertView,
  type Confinement,
  type NearConfig,
} from "./format";
import { BOUND_CONTRACT, NEAR_DEPLOYMENT, TOKEN_CONTRACT } from "./deployment";
import { viewAccessKeys, viewAccount, viewFunction } from "./rpc";

async function attempt<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export interface ContractCheck {
  accountId: string;
  recordedCodeHash: string;
  wasmSha256: string;
  onChainCodeHash: string | null;
  matches: boolean | null;
}

export interface DeploymentFacts {
  config: NearConfig | null;
  accounts: {
    owner: string;
    token: string;
    treasury: string;
    arbiter: string;
  } | null;
  certCount: number | null;
  challengeCount: number | null;
  treasuryBalance: string | null;
  contracts: ContractCheck[];
}

async function checkContract(c: {
  accountId: string;
  codeHash: string;
  wasmSha256: string;
}): Promise<ContractCheck> {
  const acc = await attempt(() => viewAccount(c.accountId));
  return {
    accountId: c.accountId,
    recordedCodeHash: c.codeHash,
    wasmSha256: c.wasmSha256,
    onChainCodeHash: acc?.code_hash ?? null,
    matches: acc ? acc.code_hash === c.codeHash : null,
  };
}

export async function getDeploymentFacts(): Promise<DeploymentFacts> {
  const [config, accounts, certCount, challengeCount, bound, token] =
    await Promise.all([
      attempt(() => viewFunction<NearConfig>(BOUND_CONTRACT, "get_config")),
      attempt(() =>
        viewFunction<DeploymentFacts["accounts"]>(
          BOUND_CONTRACT,
          "get_accounts",
        ),
      ),
      attempt(() => viewFunction<number>(BOUND_CONTRACT, "cert_count")),
      attempt(() => viewFunction<number>(BOUND_CONTRACT, "challenge_count")),
      checkContract(NEAR_DEPLOYMENT.contracts.bound),
      checkContract(NEAR_DEPLOYMENT.contracts.token),
    ]);
  const treasury = accounts?.treasury ?? NEAR_DEPLOYMENT.accounts.treasury;
  const treasuryBalance = await attempt(() =>
    viewFunction<string>(BOUND_CONTRACT, "balance_of", {
      account_id: treasury,
    }),
  );
  return {
    config,
    accounts,
    certCount,
    challengeCount,
    treasuryBalance,
    contracts: [bound, token],
  };
}

/** Newest first. `null` means the list could not be read. */
export async function listCerts(): Promise<CertView[] | null> {
  const count = await attempt(() =>
    viewFunction<number>(BOUND_CONTRACT, "cert_count"),
  );
  if (count === null) return null;
  const pages: Promise<CertView[]>[] = [];
  for (let from = 0; from < count; from += 50) {
    pages.push(
      viewFunction<CertView[]>(BOUND_CONTRACT, "list_certs", {
        from_index: from,
        limit: 50,
      }),
    );
  }
  const all = await attempt(() => Promise.all(pages));
  return all ? all.flat().reverse() : null;
}

export type Lookup<T> = { ok: true; value: T } | { ok: false };

/** `{ok:true, value:null}` is "no certificate"; `{ok:false}` is "no answer". */
export async function verifyAgent(
  agent: string,
): Promise<Lookup<CertView | null>> {
  try {
    return {
      ok: true,
      value: await viewFunction<CertView | null>(BOUND_CONTRACT, "verify", {
        agent,
      }),
    };
  } catch {
    return { ok: false };
  }
}

export async function getCert(
  certId: number,
): Promise<Lookup<CertView | null>> {
  try {
    return {
      ok: true,
      value: await viewFunction<CertView | null>(BOUND_CONTRACT, "get_cert", {
        cert_id: certId,
      }),
    };
  } catch {
    return { ok: false };
  }
}

/** The contract has no per-cert index; challenges are few, so scan them. */
export async function getChallengesForCert(
  certId: number,
): Promise<ChallengeView[] | null> {
  const count = await attempt(() =>
    viewFunction<number>(BOUND_CONTRACT, "challenge_count"),
  );
  if (count === null) return null;
  const ids = Array.from({ length: Math.min(count, 200) }, (_, i) => i);
  const all = await attempt(() =>
    Promise.all(
      ids.map((id) =>
        viewFunction<ChallengeView | null>(BOUND_CONTRACT, "get_challenge", {
          challenge_id: id,
        }),
      ),
    ),
  );
  if (!all) return null;
  return all.filter(
    (c): c is ChallengeView => c !== null && c.cert_id === certId,
  );
}

export async function getConfinement(
  agent: string,
): Promise<Confinement | null> {
  const keys = await attempt(() => viewAccessKeys(agent));
  return keys ? confinement(keys, BOUND_CONTRACT) : null;
}

/** Internal Bound balance and wallet token balance of one account. */
export async function getBalances(accountId: string) {
  const [bound, token] = await Promise.all([
    attempt(() =>
      viewFunction<string>(BOUND_CONTRACT, "balance_of", {
        account_id: accountId,
      }),
    ),
    attempt(() =>
      viewFunction<string>(TOKEN_CONTRACT, "ft_balance_of", {
        account_id: accountId,
      }),
    ),
  ]);
  return { bound, token };
}
