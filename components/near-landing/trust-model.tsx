import { Section } from "@/components/navy/section";
import { Text } from "@/components/navy/text";

/** What the deploy does not claim, as hairline list rows. */
const limits = [
  "It runs on NEAR testnet with a test token. Nothing here is real money.",
  "The arbiter, the treasury and the full-access keys of the Bound and mock USDC contracts are held by the author. A harm claim is decided by that one arbiter account, fixed at init and readable by anyone with get_accounts on the contract.",
  "Because the contract account keeps its deployer key, its code could be replaced. The code-hash check above is how you see that it has not been.",
  "The demo auditor is ours too. A certificate proves committed capital, not good behaviour.",
];

export function TrustModel() {
  return (
    <Section aria-labelledby="trust-heading" label="Trust model">
      <Text
        tag="h2"
        id="trust-heading"
        variant="displayMD"
        className="text-foreground max-w-xl tracking-tight text-balance"
      >
        What this deploy <em>does not claim</em>
      </Text>
      <ul role="list" className="border-border mt-12 border-t">
        {limits.map((item) => (
          <li key={item} className="border-border border-b py-5">
            <Text
              tag="p"
              variant="textBase"
              className="text-muted-foreground max-w-3xl text-pretty"
            >
              {item}
            </Text>
          </li>
        ))}
      </ul>
    </Section>
  );
}
