import { clsx } from "clsx";

/** Navy's text input: one of the two places with a radius (buttons are the other). */
export const inputClass =
  "h-10 w-full px-3 text-sm rounded-lg bg-background text-foreground placeholder:text-faint-foreground ring-1 ring-inset ring-border border-0 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50";

export function Input({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputClass, className)} {...rest} />;
}
