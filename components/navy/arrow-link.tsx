import { Slot, Slottable } from "@radix-ui/react-slot";
import { clsx } from "clsx";

/**
 * A text link with a chevron that nudges right on hover. Inside a card that
 * is already a link, pass `tag="span"` and give the card `group`. With
 * `asChild` it styles its only child (e.g. a next/link <Link>) and appends
 * the chevron inside it.
 */
export type ArrowLinkSize = "xs" | "sm" | "base";
export type ArrowLinkTone = "default" | "muted" | "inverse";

const sizes: Record<ArrowLinkSize, { text: string; icon: string }> = {
  xs: { text: "text-xs", icon: "size-3" },
  sm: { text: "text-sm", icon: "size-3.5" },
  base: { text: "text-base", icon: "size-4" },
};

const tones: Record<ArrowLinkTone, string> = {
  default: "text-foreground hover:text-muted-foreground",
  muted: "text-muted-foreground hover:text-foreground",
  inverse: "text-inverse-foreground hover:text-inverse-foreground/70",
};

export type ArrowLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  tag?: "a" | "span";
  size?: ArrowLinkSize;
  tone?: ArrowLinkTone;
  asChild?: boolean;
};

export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 6l6 6l-6 6" />
    </svg>
  );
}

export function ArrowLink({
  tag = "a",
  size = "sm",
  tone = "default",
  asChild = false,
  className,
  children,
  ...rest
}: ArrowLinkProps) {
  const s = sizes[size];
  const classes = clsx(
    "inline-flex items-center gap-1 font-medium transition-colors group/link rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
    s.text,
    tones[tone],
    className,
  );
  const chevron = (
    <Chevron
      className={clsx(
        "transition-transform duration-300 group-hover:translate-x-0.5 group-hover/link:translate-x-0.5 motion-reduce:transition-none",
        s.icon,
      )}
    />
  );
  if (asChild) {
    return (
      <Slot className={classes} {...rest}>
        <Slottable>{children}</Slottable>
        {chevron}
      </Slot>
    );
  }
  const Tag = tag;
  return (
    <Tag className={classes} {...rest}>
      {children}
      {chevron}
    </Tag>
  );
}
