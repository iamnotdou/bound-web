import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";

/**
 * Navy's button. `default` is navy ink, `accent` ultramarine (one per
 * group), `muted` light, `none` unstyled. Each has a top-to-bottom gradient
 * and a layered edge from the shadow-button-* tokens.
 *
 * Renders an <a> when `href` is given, a <button type="button"> otherwise,
 * or styles its only child with `asChild` (e.g. a next/link <Link>).
 */
export type ButtonVariant = "default" | "accent" | "muted" | "none";
export type ButtonSize = "xxs" | "xs" | "sm" | "base" | "md" | "lg" | "xl";
export type ButtonGap = "xs" | "sm" | "base" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  default:
    "text-inverse-foreground bg-linear-to-b from-inverse-highlight to-inverse shadow-button-inverse hover:brightness-125",
  accent:
    "text-primary-foreground bg-linear-to-b from-primary-highlight to-primary shadow-button-primary hover:brightness-110",
  muted:
    "text-foreground bg-linear-to-b from-background to-muted shadow-button-muted hover:brightness-97",
  none: "",
};

const sizes: Record<ButtonSize, string> = {
  xxs: "h-7 px-3 text-xs rounded-md",
  xs: "h-8 px-3.5 text-xs rounded-md",
  sm: "h-9 px-4 text-sm rounded-lg",
  base: "h-10 px-5 text-sm rounded-lg",
  md: "h-11 px-5 text-base rounded-lg",
  lg: "h-12 px-6 text-base rounded-lg",
  xl: "h-13 px-7 text-lg rounded-lg",
};

const iconSizes: Record<ButtonSize, string> = {
  xxs: "size-7 text-xs rounded-md",
  xs: "size-8 text-xs rounded-md",
  sm: "size-9 text-sm rounded-lg",
  base: "size-10 text-base rounded-lg",
  md: "size-11 text-base rounded-lg",
  lg: "size-12 text-lg rounded-lg",
  xl: "size-13 text-base rounded-lg",
};

const gaps: Record<ButtonGap, string> = {
  xs: "gap-2",
  sm: "gap-4",
  base: "gap-8",
  md: "gap-10",
  lg: "gap-12",
};

const base =
  "flex justify-center text-center font-medium items-center whitespace-nowrap duration-200 ease-out transition active:scale-98 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100";

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square button for a single icon; give it an aria-label. */
  iconOnly?: boolean;
  gap?: ButtonGap;
  asChild?: boolean;
  className?: string;
};

export type ButtonProps =
  | (Common & React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
  | (Common &
      React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined });

export function buttonClass({
  variant = "default",
  size = "base",
  iconOnly = false,
  gap,
  className,
}: Omit<Common, "asChild">) {
  return clsx(
    base,
    variants[variant],
    iconOnly ? iconSizes[size] : sizes[size],
    !iconOnly && gap && gaps[gap],
    className,
  );
}

export function Button(props: ButtonProps) {
  const { variant, size, iconOnly, gap, asChild, className, ...rest } = props;
  const classes = buttonClass({ variant, size, iconOnly, gap, className });
  if (asChild) {
    return (
      <Slot
        className={classes}
        {...(rest as React.HTMLAttributes<HTMLElement>)}
      />
    );
  }
  if (typeof rest.href === "string") {
    return (
      <a
        className={classes}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      />
    );
  }
  const buttonRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      className={classes}
      {...buttonRest}
      type={buttonRest.type ?? "button"}
    />
  );
}
