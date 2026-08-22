/**
 * The demo auditor attests, server-side.
 *
 *   POST /api/attest { certId, allocationUsd }
 *     → 200 { hash, auditor, allocationStroops }
 *     → 400 { error, code }   — a precondition the UI would have shown first
 *     → 503 { error, code }   — no AUDITOR_SECRET on this deployment
 *     → 502 { error }         — the chain refused it after all
 *
 * This exists because the flow needs two actors and a browser wallet holds one
 * key. Someone with a single Freighter account can publish and fund a
 * certificate and then be stuck: the last step has to come from somebody else.
 * Rather than tell them to install a second wallet, this signs as
 * boundprotocol.dev's own auditor.
 *
 * That is not a free pass. The capital is real, slashable testnet stake, and
 * every certificate it touches carries `DemoAuditorNote` saying whose it is —
 * see decision 6 in SPEC.md §3. The refusals below reuse `gate("attest", …)`,
 * so this endpoint cannot be talked into doing something the UI would have
 * refused.
 *
 * `AUDITOR_SECRET` is not the issuer and not the deployer. A leak costs the
 * demo auditor's stake and nothing else.
 */
import { Keypair } from "@stellar/stellar-sdk";
import { bound, usdc } from "@bound/sdk";
import { getCertificateFacts } from "@/lib/bound";
import { deriveCertState } from "@/lib/cert-state";
import { nowUnix } from "@/lib/clock";
import { DEMO_AUDITOR } from "@/lib/deployment";
import { gate, translateContractError } from "@/lib/preconditions";
import { readWalletFacts } from "@/lib/wallet-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" } as const;

function auditorKeypair(): Keypair {
  const secret = process.env.AUDITOR_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "AUDITOR_SECRET is not set on this deployment, so the demo auditor cannot sign.",
    );
  }
  const keypair = Keypair.fromSecret(secret);
  if (keypair.publicKey() !== DEMO_AUDITOR) {
    throw new Error(
      `AUDITOR_SECRET is ${keypair.publicKey()} but the committed deployment names ${DEMO_AUDITOR} as the demo auditor.`,
    );
  }
  return keypair;
}

export async function GET() {
  try {
    const auditor = auditorKeypair().publicKey();
    const facts = await readWalletFacts(auditor);
    return Response.json(
      { configured: true, auditor, wallet: facts },
      { headers: NO_STORE },
    );
  } catch (error) {
    return Response.json(
      { configured: false, error: (error as Error).message },
      { headers: NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  let body: { certId?: unknown; allocationUsd?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid JSON body" },
      { status: 400, headers: NO_STORE },
    );
  }

  const certId = Number(body.certId);
  if (!Number.isSafeInteger(certId) || certId < 1) {
    return Response.json(
      { error: "a certificate id is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  const allocationUsd = Number(body.allocationUsd);
  if (!Number.isFinite(allocationUsd) || allocationUsd <= 0) {
    return Response.json(
      {
        error:
          "an allocation is required. An auditor prices its own risk; there is no default worth defaulting to.",
        code: "insufficient-free-stake",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  let keypair: Keypair;
  try {
    keypair = auditorKeypair();
  } catch (error) {
    return Response.json(
      { error: (error as Error).message, code: "not-registered" },
      { status: 503, headers: NO_STORE },
    );
  }

  const facts = await getCertificateFacts(certId);
  if (!facts) {
    return Response.json(
      { error: `no readable certificate #${certId}`, code: "archived" },
      { status: 400, headers: NO_STORE },
    );
  }

  let wallet;
  try {
    wallet = await readWalletFacts(keypair.publicKey());
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 502, headers: NO_STORE },
    );
  }

  const now = nowUnix();
  const allocationStroops = usdc(allocationUsd);
  // The same table the button was gated with. An endpoint that signs on the
  // server has to answer to it too, or it becomes the way around the gate.
  const decision = gate("attest", {
    address: keypair.publicKey(),
    wallet,
    facts,
    state: deriveCertState(facts, now),
    amountStroops: allocationStroops.toString(),
    nowUnix: now,
  });

  if (!decision.ok) {
    return Response.json(
      { error: decision.reason, code: decision.code },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const sent = await bound.attestCertificate(
      keypair,
      BigInt(certId),
      allocationStroops,
    );
    return Response.json(
      {
        hash: sent.hash ?? null,
        auditor: keypair.publicKey(),
        allocationStroops: allocationStroops.toString(),
        disclosure:
          "This attestation was signed by boundprotocol.dev's own auditor account. Its capital is real and slashable, and it is not an independent third party.",
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    const raw = (error as Error).message;
    const translated = translateContractError(raw, "attest");
    return Response.json(
      translated
        ? { error: translated.message, code: translated.code, raw }
        : { error: raw, raw },
      { status: 502, headers: NO_STORE },
    );
  }
}
