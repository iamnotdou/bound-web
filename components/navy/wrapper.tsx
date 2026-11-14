import { clsx } from "clsx";

/**
 * The only page container. `standard` is the 340-unit centred column with
 * the 2rem gutter; `prose` styles markdown-like bodies (see `.navy-prose`
 * in app/navy.css) and is meant to sit inside a standard Wrapper.
 */
export type WrapperVariant = "standard" | "prose";

const variants: Record<WrapperVariant, string> = {
  standard: "max-w-340 mx-auto px-8",
  prose: "navy-prose",
};

export function Wrapper({
  variant = "standard",
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { variant?: WrapperVariant }) {
  return <div className={clsx(variants[variant], className)} {...rest} />;
}
