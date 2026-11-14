import { Section } from "@/components/navy/section";
import { Text } from "@/components/navy/text";

/** Navy's StatusPages layout: heading on the left, a hairline list right. */
const problems = [
  {
    title: "No one to hold liable",
    text: "A service that sells to an agent, or extends it credit, has nothing to check and no one to recover from. “My agent is safe” cannot be sized and cannot be claimed against.",
  },
  {
    title: "Keys do whatever they can",
    text: "A prompt-injected or buggy agent spends what its key allows. With a full-access key, that is everything on the account.",
  },
  {
    title: "Losses have nowhere to land",
    text: "When harm happens there is no money set aside for it and no rule for who is paid first. Each dispute starts from zero.",
  },
];

export function Problem() {
  return (
    <Section aria-labelledby="problem-heading" label="The problem">
      <div className="grid gap-12 lg:grid-cols-9 lg:gap-x-8">
        <div className="lg:col-span-4">
          <Text
            tag="h2"
            id="problem-heading"
            variant="displayMD"
            className="text-foreground tracking-tight text-balance"
          >
            You cannot trust an agent <em>you cannot sue</em>
          </Text>
        </div>
        <dl className="border-border border-b lg:col-span-5">
          {problems.map((item) => (
            <div
              key={item.title}
              className="border-border grid gap-2 border-t py-6 sm:grid-cols-2 sm:gap-8"
            >
              <dt>
                <Text
                  tag="span"
                  variant="textBase"
                  className="text-foreground font-medium"
                >
                  {item.title}
                </Text>
              </dt>
              <dd>
                <Text
                  tag="span"
                  variant="textSM"
                  className="text-muted-foreground text-pretty"
                >
                  {item.text}
                </Text>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
