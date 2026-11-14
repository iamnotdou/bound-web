import { clsx } from "clsx";
import { Text } from "@/components/navy/text";

/**
 * Every in-page call to action: heading and text on the left, actions
 * (`children`) on the right. Only the ground changes between them. On the
 * dark tones put `ArrowLink tone="inverse"` or a `muted` Button inside.
 */
export type CtaTone = "inverse" | "primary" | "lilac" | "muted";

const grounds: Record<CtaTone, string> = {
  inverse: "bg-inverse",
  primary: "bg-primary",
  lilac: "bg-lilac",
  muted: "bg-muted",
};

export function CtaPanel({
  tone = "inverse",
  title,
  text,
  headingTag = "h2",
  id,
  className,
  children,
}: {
  tone?: CtaTone;
  title: React.ReactNode;
  text?: React.ReactNode;
  headingTag?: "h2" | "h3";
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const dark = tone === "inverse" || tone === "primary";
  return (
    <div
      id={id}
      className={clsx(
        "flex flex-col gap-8 p-8 md:flex-row md:items-end md:justify-between lg:p-10",
        id && "scroll-mt-28",
        grounds[tone],
        className,
      )}
    >
      <div>
        <Text
          tag={headingTag}
          variant="displayMD"
          className={clsx(
            "text-balance",
            dark ? "text-inverse-foreground" : "text-foreground",
          )}
        >
          {title}
        </Text>
        {text != null && (
          <Text
            tag="p"
            variant="textBase"
            className={clsx(
              "mt-4 max-w-lg text-pretty",
              dark ? "text-inverse-foreground/70" : "text-muted-foreground",
            )}
          >
            {text}
          </Text>
        )}
      </div>
      {children != null && <div className="shrink-0">{children}</div>}
    </div>
  );
}
