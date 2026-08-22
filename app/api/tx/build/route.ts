/**
 * Build an unsigned (assembled) envelope for the connected wallet to sign.
 *
 *   POST /api/tx/build  { action, address, params }
 *     → 200 { xdr, networkPassphrase }
 *     → 400 { error, code, raw }  — unknown action, or the chain refused it
 *
 * The wallet is both the transaction source and the `require_auth` address, so
 * the returned envelope needs exactly one signature and no secret key is used
 * here.
 *
 * The build is simulated against the chain *as assembled* before it is handed
 * back — see `assertSignableXdr`, and the defect it documents. A request that
 * could never succeed fails here, with the contract's own words, rather than
 * after the user has signed and paid.
 *
 * `error` is a sentence for a human when the failure is one this app
 * recognises, and `raw` is always the unedited string the chain produced. When
 * `code` is absent the failure is unrecognised and the client must show `raw`
 * **as raw** — a friendly message that guesses at a cause is worse than the
 * contract's own, because the reader cannot tell that it is a guess.
 */
import {
  assertSignableXdr,
  buildAppActionXdr,
  isAppAction,
  networkPassphrase,
  type AppAction,
  type AppBuildParams,
} from "@/lib/tx";
import { translateContractError, type ActionKey } from "@/lib/preconditions";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * `deposit-fee` and `pay` are buildable and have no UI in this app, so there
 * is no gate for them and nothing to translate their failures into. They fall
 * through to raw, which is the honest end state for an action nothing here
 * claims to understand.
 */
function asActionKey(action: AppAction): ActionKey | null {
  switch (action) {
    case "publish":
    case "stake":
    case "attest":
    case "challenge":
    case "trustline":
      return action;
    case "deposit":
      return "fund";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  let body: {
    action?: unknown;
    address?: unknown;
    params?: AppBuildParams;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { action } = body;
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const params = (body.params ?? {}) as AppBuildParams;

  if (!isAppAction(action)) {
    return Response.json(
      { error: `unknown action: ${String(action)}` },
      { status: 400 },
    );
  }
  if (!address) {
    return Response.json(
      { error: "a connected wallet address is required" },
      { status: 400 },
    );
  }

  try {
    const xdr = await buildAppActionXdr(action, address, params);
    await assertSignableXdr(xdr, address);
    return Response.json({ xdr, networkPassphrase: networkPassphrase() });
  } catch (error) {
    const raw = (error as Error).message;
    const key = asActionKey(action);
    const translated = key === null ? null : translateContractError(raw, key);
    return Response.json(
      translated
        ? { error: translated.message, code: translated.code, raw }
        : { error: raw, raw },
      { status: 400 },
    );
  }
}
