import { clsx } from "clsx";
import { grid, mainCol, sideCol } from "@/components/navy/grid";
import { Text } from "@/components/navy/text";

/**
 * A side label and the content on the site grid. `label="Network"` renders
 * `/// Network` in the side column, `children` fill the main column, and
 * `full` spans all twelve columns underneath (tables, card rows). Pass
 * `side` instead of `label` when the side column needs more than a label.
 */
export function LabeledGrid({
  label,
  side,
  full,
  className,
  children,
}: {
  label?: string;
  side?: React.ReactNode;
  full?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={clsx("grid gap-y-12", grid, className)}>
      <div className={sideCol}>
        {side ??
          (label && (
            <Text
              tag="p"
              variant="textSM"
              className="text-foreground font-medium uppercase"
            >
              <span aria-hidden="true">{"///"}</span> {label}
            </Text>
          ))}
      </div>
      <div className={clsx("min-w-0", mainCol)}>{children}</div>
      {full != null && (
        <div className="mt-10 min-w-0 lg:col-span-12">{full}</div>
      )}
    </div>
  );
}
