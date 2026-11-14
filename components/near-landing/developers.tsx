import Link from "next/link";
import { ArrowLink } from "@/components/navy/arrow-link";
import { Section } from "@/components/navy/section";
import { Text } from "@/components/navy/text";
import { Term } from "@/components/near-landing/term";
import { NEAR_SNIPPETS } from "@/lib/near/links";

/**
 * The developer surface on a hairline grid. Code blocks are the one place
 * monospace (`font-code`) is allowed.
 */
const tools: { title: string; text: React.ReactNode; code: string }[] = [
  {
    title: "SDK",
    text: "A typed client for the contract, for your service or script.",
    code: NEAR_SNIPPETS.install,
  },
  {
    title: "CLI",
    text: "The same answer from a terminal.",
    code: NEAR_SNIPPETS.verify,
  },
  {
    title: "MCP server",
    text: (
      <>
        Read tools need nothing; <Term>near_pay</Term> needs the agent&apos;s
        function-call key.
      </>
    ),
    code: NEAR_SNIPPETS.mcp,
  },
];

export function Developers() {
  return (
    <Section
      aria-labelledby="dev-heading"
      label="For developers"
      full={
        <>
          <div className="border-border grid border-t border-l md:grid-cols-3">
            {tools.map((tool) => (
              <div
                key={tool.title}
                className="border-border flex min-w-0 flex-col border-r border-b p-6"
              >
                <Text
                  tag="h3"
                  variant="textBase"
                  className="text-foreground font-medium"
                >
                  {tool.title}
                </Text>
                <Text
                  tag="p"
                  variant="textSM"
                  className="text-muted-foreground mt-1 text-pretty"
                >
                  {tool.text}
                </Text>
                <pre className="bg-muted text-foreground font-code mt-8 text-xs leading-relaxed overflow-x-auto p-4 whitespace-pre">
                  <code className="font-code">{tool.code}</code>
                </pre>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Text tag="p" variant="textSM" className="text-muted-foreground">
              Or over HTTP:{" "}
              <code className="font-code text-foreground wrap-anywhere text-xs">
                {NEAR_SNIPPETS.http}
              </code>
            </Text>
            <ArrowLink asChild>
              <Link href="/docs">Docs</Link>
            </ArrowLink>
          </div>
        </>
      }
    >
      <Text
        tag="h2"
        id="dev-heading"
        variant="displayMD"
        className="text-foreground max-w-xl tracking-tight text-balance"
      >
        Check a certificate <em>before you serve</em> an agent
      </Text>
      <Text
        tag="p"
        variant="textBase"
        className="text-muted-foreground mt-4 max-w-xl text-pretty"
      >
        The <Term>@bound/near</Term> package is a typed client for the contract,
        a command line and an MCP server, so a service, a script or an LLM agent
        can ask the same question this site asks.
      </Text>
    </Section>
  );
}
