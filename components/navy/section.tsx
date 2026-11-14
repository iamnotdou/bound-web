import { clsx } from "clsx";
import { LabeledGrid } from "@/components/navy/labeled-grid";
import { Wrapper } from "@/components/navy/wrapper";

/**
 * A page section: the <section> takes only its ground, the Wrapper inside
 * carries the spacing (`py-24` by default). With `label` or `full` the
 * content is laid out on a LabeledGrid; without, children go straight into
 * the Wrapper.
 */
export type SectionGround =
  | "none"
  | "background"
  | "muted"
  | "inverse"
  | "primary"
  | "lilac"
  | "mist"
  | "frost";

const grounds: Record<SectionGround, string | undefined> = {
  none: undefined,
  background: "bg-background",
  muted: "bg-muted",
  inverse: "bg-inverse",
  primary: "bg-primary",
  lilac: "bg-lilac",
  mist: "bg-mist",
  frost: "bg-frost",
};

export function Section({
  ground = "none",
  label,
  side,
  full,
  id,
  className,
  wrapperClassName = "py-24",
  children,
  ...rest
}: Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  ground?: SectionGround;
  label?: string;
  side?: React.ReactNode;
  full?: React.ReactNode;
  wrapperClassName?: string;
  children?: React.ReactNode;
}) {
  const grid = label != null || side != null || full != null;
  return (
    <section id={id} className={clsx(grounds[ground], className)} {...rest}>
      <Wrapper className={wrapperClassName}>
        {grid ? (
          <LabeledGrid label={label} side={side} full={full}>
            {children}
          </LabeledGrid>
        ) : (
          children
        )}
      </Wrapper>
    </section>
  );
}
