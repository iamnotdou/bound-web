import { clsx } from "clsx";
import { GradientBackground } from "@/components/navy/gradient-shader";
import { grid, mainCol, mainStart } from "@/components/navy/grid";
import { Wrapper } from "@/components/navy/wrapper";

/**
 * Navy's gradient hero recipe: the shader arch with its CSS fallback, a
 * `data-nav-dark` band so the fixed navigation turns transparent with white
 * links, and the content on `mainCol mainStart`. It marks the page
 * `data-nav-start="dark"`, so the bar paints dark from the first frame and
 * <main> drops its top padding to let the hero run under the bar.
 *
 * Use it once, as the first thing on a page. Put a white h1 inside:
 * `<Text tag="h1" variant="displayLG" className="tracking-tight text-balance text-inverse-foreground">`.
 * `after` renders a second row under the main content (e.g. a short
 * description and an ArrowLink), like Navy's landing hero.
 */
export function GradientHero({
  children,
  after,
  className,
  contentClassName,
  labelledBy,
}: {
  children: React.ReactNode;
  after?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={clsx("relative overflow-hidden", className)}
    >
      <GradientBackground variant="default" />
      <div
        data-nav-dark
        data-nav-start="dark"
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-120"
      />
      <Wrapper
        className={clsx(
          "relative grid min-h-160 content-center pt-32 pb-24",
          grid,
        )}
      >
        <div className={clsx("min-w-0", mainCol, mainStart, contentClassName)}>
          {children}
        </div>
        {after != null && (
          <div className={clsx("mt-16 min-w-0", mainCol, mainStart)}>
            {after}
          </div>
        )}
      </Wrapper>
    </section>
  );
}

/** A full-bleed shader band between sections, no content. */
export function Band({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx("relative h-120 overflow-hidden", className)}
    >
      <GradientBackground variant="band" />
      <div data-nav-dark className="absolute inset-x-0 top-1/3 h-1/3" />
    </div>
  );
}
