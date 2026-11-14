import { clsx } from "clsx";

/**
 * The Bound wordmark in Navy style: a plain uppercase, semibold, tight,
 * monochrome word with no mark (it takes `currentColor`, so colour it with a
 * text-* class).
 */
export type LogoSize = "sm" | "base" | "lg";

const sizes: Record<LogoSize, string> = {
  sm: "text-base",
  base: "text-xl",
  lg: "text-2xl",
};

export function Logo({
  size = "base",
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  size?: LogoSize;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center leading-none font-semibold tracking-tight uppercase",
        sizes[size],
        className,
      )}
      {...rest}
    >
      Bound
    </span>
  );
}
