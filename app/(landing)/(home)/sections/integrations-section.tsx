import { cn } from "@/lib/utils";
import { GooglePalm } from "@/components/ui/svgs/google-palm";
import { Vercel } from "@/components/ui/svgs/vercel";
import { Claude as ClaudeAiIcon } from "@/components/ui/svgs/claude";
import { Container } from "@/components/container";
import { Cloudflare } from "@/components/ui/svgs/cloudflare";
export function IntegrationsSection() {
  return (
    <section id="integrations">
      <Container className="py-16 lg:py-24">
        <div className="mx-auto w-full max-w-5xl px-6 xl:px-0">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <h2 className="text-foreground text-balance text-4xl font-semibold lg:text-5xl">
              Plugs into your agent stack
            </h2>
            <p className="text-muted-foreground text-balance text-lg">
              Bound works wherever your agents run — check and enforce bonds
              from your platform of choice, with any model behind them.
            </p>
          </div>
        </div>
      </Container>

      <Container asGrid className="@4xl:grid-cols-6 grid">
        <div className="@max-4xl:hidden">
          <div data-grid-content />
        </div>

        <div className="@4xl:col-span-4">
          <div className="@lg:grid-cols-4 grid gap-px">
            <div data-grid-content className="p-4! col-span-2 text-center">
              <span className="text-muted-foreground font-mono text-sm">
                Platform
              </span>
            </div>

            <div
              data-grid-content
              className="@max-lg:row-start-3 p-4! col-span-2 text-center"
            >
              <span className="text-muted-foreground font-mono text-sm">
                LLMs
              </span>
            </div>

            <Integration label="Cloudflare">
              <Cloudflare />
            </Integration>

            <Integration label="Vercel">
              <Vercel />
            </Integration>

            <Integration label="Gemini">
              <GooglePalm />
            </Integration>

            <Integration label="Claude AI">
              <ClaudeAiIcon />
            </Integration>
          </div>
        </div>

        <div className="@max-4xl:hidden">
          <div data-grid-content />
        </div>
      </Container>
    </section>
  );
}

const Integration = ({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) => {
  return (
    <div
      className={cn(
        "hover:bg-card group relative flex aspect-square hover:z-10",
        className,
      )}
    >
      <div className="z-1 pointer-events-none absolute inset-0 flex size-full duration-200 ease-out *:m-auto *:size-10 *:duration-200 group-hover:opacity-65 group-hover:*:-translate-y-3">
        {children}
      </div>
      <span className="scale-97 pointer-events-none absolute inset-0 z-10 m-auto block size-fit translate-y-[125%] text-sm font-medium opacity-0 duration-200 group-hover:scale-100 group-hover:opacity-100">
        {label}
      </span>
      <div className="absolute inset-0 rounded opacity-0 shadow-2xl shadow-indigo-900/15 duration-200 group-hover:opacity-100" />
      <div
        data-grid-content
        className="**:fill-foreground group-hover:**:fill-muted-foreground hover:dither-lg relative flex size-full *:m-auto *:size-10 *:duration-200 group-hover:*:-translate-y-3"
      >
        {children}
      </div>
    </div>
  );
};
