import { clsx } from "clsx";
import { LogoIcon } from "@/components/logo";

/**
 * The Bound logo in Navy style: the Bound mark and the Bound name, both in
 * `currentColor` (colour it with a text-* class). `tag` adds a small label
 * tucked into the top-right corner of the name, e.g. "on NEAR". `markOnly`
 * shows just the mark.
 */
export type LogoSize = "sm" | "base" | "lg";

const sizes: Record<LogoSize, { word: string; mark: string }> = {
  sm: { word: "text-base", mark: "h-4 w-auto text-current" },
  base: { word: "text-xl", mark: "h-6 w-auto text-current" },
  lg: { word: "text-2xl", mark: "h-6 w-auto text-current" },
};

export function Logo({
  size = "base",
  tag,
  markOnly = false,
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  size?: LogoSize;
  tag?: string;
  /** Only the Bound mark, no name and no tag (the site header). */
  markOnly?: boolean;
}) {
  return (
    <span
      className={clsx("inline-flex items-center gap-2 leading-none", className)}
      {...rest}
    >
      <LogoIcon className={sizes[size].mark} />
      {markOnly ? null : (
        <span
          className={clsx(
            "relative font-semibold tracking-tight",
            sizes[size].word,
          )}
        >
          Bound
          {tag ? (
            <span className="absolute -top-1 left-full ml-0.5 text-xs leading-none font-medium tracking-normal whitespace-nowrap uppercase opacity-70">
              {tag}
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}
