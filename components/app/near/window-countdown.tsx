"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/near/format";

/**
 * Counts down a claim window from the chain's own clock. The server hands
 * over `secondsLeft` computed against the block timestamp in the cert view,
 * so a skewed visitor clock cannot make the window look open or closed; this
 * only subtracts the seconds elapsed since the page rendered.
 */
export function WindowCountdown({ secondsLeft }: { secondsLeft: number }) {
  const [left, setLeft] = useState(secondsLeft);
  useEffect(() => {
    const started = performance.now();
    const t = setInterval(() => {
      const elapsed = Math.floor((performance.now() - started) / 1000);
      setLeft(Math.max(0, secondsLeft - elapsed));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);
  return (
    <span className="tabular-nums" aria-live="polite">
      {left > 0
        ? `closes in ${formatDuration(left)}`
        : "closable now: anyone may call close_window (reload to see the result)"}
    </span>
  );
}
