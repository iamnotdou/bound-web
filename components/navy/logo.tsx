import { clsx } from "clsx";
import { LogoIcon } from "@/components/logo";

/**
 * The Bound wordmark in Navy style: uppercase, semibold, tight, monochrome
 * (it takes `currentColor`, so colour it with a text-* class). The Bound
 * mark sits in front unless `mark={false}`.
 */
export type LogoSize = "sm" | "base" | "lg";

const sizes: Record<LogoSize, { text: string; mark: string }> = {
  sm: { text: "text-base", mark: "size-5" },
  base: { text: "text-xl", mark: "size-6" },
  lg: { text: "text-2xl", mark: "size-7" },
};

export function Logo({
  size = "base",
  mark = true,
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  size?: LogoSize;
  mark?: boolean;
}) {
  const s = sizes[size];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 leading-none font-semibold tracking-tight uppercase",
        s.text,
        className,
      )}
      {...rest}
    >
      {mark && <LogoIcon className={clsx("text-current", s.mark)} />}
      Bound
    </span>
  );
}
