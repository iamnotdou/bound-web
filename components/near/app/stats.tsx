import { clsx } from "clsx";
import { Text } from "@/components/navy/text";

/**
 * Navy's landing Numbers row: a big display figure, its unit in the accent,
 * a label underneath and a line of supporting text.
 */
export type Stat = {
  value: string;
  unit?: string;
  /** Show the unit at text size rather than display size (long units). */
  smallUnit?: boolean;
  label: React.ReactNode;
  text?: React.ReactNode;
};

export function Stats({
  stats,
  cols = 4,
  className,
}: {
  stats: Stat[];
  /** Columns at lg: 4 across the full grid, 2 inside the main column. */
  cols?: 2 | 4;
  className?: string;
}) {
  return (
    <dl
      className={clsx(
        "grid gap-8 sm:grid-cols-2",
        cols === 4 && "lg:grid-cols-4",
        className,
      )}
    >
      {stats.map((stat, i) => (
        <div key={i} className="flex min-w-0 flex-col">
          <dt className="order-2 mt-6">
            <Text
              tag="span"
              variant="textBase"
              className="text-foreground font-medium"
            >
              {stat.label}
            </Text>
          </dt>
          <dd className="order-1">
            <Text
              tag="span"
              variant="display3XL"
              className="text-foreground tracking-tight tabular-nums break-all"
            >
              {stat.value}
              {stat.unit ? (
                stat.smallUnit ? (
                  <span className="text-primary ml-2 text-xl tracking-normal">
                    {stat.unit}
                  </span>
                ) : (
                  <span className="text-primary">{stat.unit}</span>
                )
              ) : null}
            </Text>
          </dd>
          {stat.text != null && (
            <dd className="order-3 mt-1">
              <Text
                tag="p"
                variant="textSM"
                className="text-muted-foreground text-pretty"
              >
                {stat.text}
              </Text>
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
