"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A code block with a copy button. The text is passed as a plain string so
 * what is copied is exactly what is shown. Long lines scroll inside the
 * block, never the page.
 */
export function CodeBlock({
  code,
  lang,
  title,
  className,
}: {
  code: string;
  lang?: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  const label = title ?? lang;

  return (
    <div
      className={cn(
        "bg-card ring-foreground/10 not-first:mt-4 relative overflow-hidden rounded-lg ring-1",
        className,
      )}
    >
      <div className="border-border text-muted-foreground flex h-9 items-center justify-between gap-2 border-b pl-3 pr-1 text-xs">
        <span className="font-address truncate">{label ?? ""}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard
              .writeText(code)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
          aria-label={copied ? "Copied" : "Copy code"}
          className="hover:text-foreground hover:bg-muted focus-visible:ring-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2 transition-colors focus-visible:outline-none focus-visible:ring-2"
        >
          {copied ? (
            <Check aria-hidden className="text-primary size-3.5" />
          ) : (
            <Copy aria-hidden className="size-3.5" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="font-address overflow-x-auto p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
