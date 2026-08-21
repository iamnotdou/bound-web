/**
 * Read back the verdict on a challenge.
 *
 *   GET /api/challenge/:challengeId → 200 { challengeId, verdict }
 *
 * `verdict` is null when the chain could not be read; "Pending" means the
 * challenge exists and nobody has resolved it yet. A read-only simulation:
 * no signature, no fee, no state change.
 */
import { readChallengeVerdict } from "@/lib/tx";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/challenge/[challengeId]">,
) {
  const { challengeId } = await params;

  if (!/^\d+$/.test(challengeId)) {
    return Response.json(
      { error: "challengeId must be a whole number" },
      { status: 400 },
    );
  }

  return Response.json({
    challengeId: Number(challengeId),
    verdict: await readChallengeVerdict(Number(challengeId)),
  });
}
