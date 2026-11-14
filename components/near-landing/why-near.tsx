import { clsx } from "clsx";
import { Section } from "@/components/navy/section";
import { Text } from "@/components/navy/text";
import { Term } from "@/components/near-landing/term";

/**
 * Navy's OnCall card row: four gapless cards cycling the inverse, primary,
 * lilac and muted grounds, a small tag on top and the copy at the bottom.
 */
const cards: {
  index: string;
  tag: string;
  ground: string;
  dark: boolean;
  title: string;
  text: React.ReactNode;
}[] = [
  {
    index: "01",
    tag: "Access key",
    ground: "bg-inverse",
    dark: true,
    title: "A function-call key limited to pay",
    text: (
      <>
        The agent&apos;s only access key is scoped to the Bound contract and the
        single method <Term>pay</Term>, with a gas-only allowance. It cannot
        transfer tokens, mint, withdraw or send NEAR; the run shows each attempt
        refused.
      </>
    ),
  },
  {
    index: "02",
    tag: "Accounts",
    ground: "bg-primary",
    dark: true,
    title: "Named accounts",
    text: (
      <>
        Certificates, allowlists and settlements name accounts like{" "}
        <span className="wrap-anywhere">bound-agent2-mwfnc6q8.testnet</span>, so
        a counterparty can read who it is dealing with, not a key hash.
      </>
    ),
  },
  {
    index: "03",
    tag: "View calls",
    ground: "bg-lilac",
    dark: false,
    title: "View calls anyone can make",
    text: (
      <>
        <Term>verify</Term>, <Term>get_cert</Term> and the agent&apos;s
        access-key list are free RPC reads. No wallet, no signature, no indexer.
      </>
    ),
  },
  {
    index: "04",
    tag: "Contract code",
    ground: "bg-muted",
    dark: false,
    title: "No code on the agent",
    text: "The agent account carries no contract code and no global contract (its code hash is all ones), so nothing on it can add a key or move funds around the meter.",
  },
];

export function WhyNear() {
  return (
    <Section
      aria-labelledby="near-heading"
      label="Why NEAR"
      full={
        <ol role="list" className="grid sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <li
              key={card.index}
              className={clsx(
                "flex flex-col gap-24 p-6 lg:gap-62",
                card.ground,
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <Text
                  tag="span"
                  variant="textSM"
                  className={clsx(
                    "tabular-nums",
                    card.dark
                      ? "text-inverse-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {card.index}
                </Text>
                <Text
                  tag="span"
                  variant="textXS"
                  className={clsx(
                    "uppercase",
                    card.dark
                      ? "text-inverse-foreground/75"
                      : "text-muted-foreground",
                  )}
                >
                  {card.tag}
                </Text>
              </div>
              <div>
                <Text
                  tag="h3"
                  variant="textBase"
                  className={clsx(
                    "font-medium",
                    card.dark ? "text-inverse-foreground" : "text-foreground",
                  )}
                >
                  {card.title}
                </Text>
                <Text
                  tag="p"
                  variant="textSM"
                  className={clsx(
                    "mt-1 text-pretty",
                    card.dark
                      ? "text-inverse-foreground/75"
                      : "text-muted-foreground",
                  )}
                >
                  {card.text}
                </Text>
              </div>
            </li>
          ))}
        </ol>
      }
    >
      <Text
        tag="h2"
        id="near-heading"
        variant="displayMD"
        className="text-foreground max-w-xl tracking-tight text-balance"
      >
        The agent&apos;s key can <em>only call pay</em>
      </Text>
      <Text
        tag="p"
        variant="textBase"
        className="text-muted-foreground mt-4 max-w-xl text-pretty"
      >
        The agent cannot route around its spend meter. On NEAR that limit is a
        property of the agent&apos;s account, not a promise in its code, and
        anyone can read it.
      </Text>
    </Section>
  );
}
