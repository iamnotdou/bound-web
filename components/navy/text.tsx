import { clsx } from "clsx";

/**
 * All text goes through Text. `tag` picks the element, `variant` the size.
 * Display variants are regular weight: put key words of an h1/h2 in <em>,
 * which the theme sets italic semibold.
 */
export type TextTag =
  | "a"
  | "p"
  | "em"
  | "span"
  | "small"
  | "strong"
  | "blockquote"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6";

export const textStyles = {
  display6XL: "font-normal text-4xl sm:text-7xl md:text-9xl lg:text-display-xl",
  display5XL: "font-normal text-4xl sm:text-7xl md:text-8xl lg:text-display-lg",
  display4XL: "font-normal text-4xl sm:text-7xl md:text-8xl lg:text-9xl",
  display3XL: "font-normal text-5xl sm:text-6xl md:text-7xl lg:text-8xl",
  display2XL: "font-normal text-5xl sm:text-5xl md:text-6xl lg:text-7xl",
  displayXL: "font-normal text-4xl sm:text-4xl md:text-5xl lg:text-6xl",
  displayLG: "font-normal text-3xl sm:text-3xl md:text-4xl lg:text-5xl",
  displayMD: "font-normal text-2xl sm:text-2xl md:text-3xl lg:text-4xl",
  displaySM: "font-normal text-lg sm:text-xl md:text-2xl lg:text-3xl",
  displayXS: "font-normal text-base sm:text-lg md:text-xl lg:text-2xl",
  textXL: "text-lg sm:text-xl md:text-2xl",
  textLG: "text-base sm:text-lg md:text-xl",
  textBase: "text-base",
  textSM: "text-sm",
  textXS: "text-xs",
} as const;

export type TextVariant = keyof typeof textStyles;

export type TextProps = React.HTMLAttributes<HTMLElement> &
  Pick<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "target" | "rel"
  > & {
    tag?: TextTag;
    variant?: TextVariant;
  };

export function Text({
  tag: Tag = "p",
  variant = "textBase",
  className,
  ...rest
}: TextProps) {
  return <Tag className={clsx(textStyles[variant], className)} {...rest} />;
}
