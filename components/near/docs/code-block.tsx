"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/navy/button";

/**
 * A code block in a muted panel with a copy button. The text is passed as a
 * plain string so what is copied is exactly what is shown. Long lines scroll
 * inside the block, never the page. The only place the code face is used.
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
      className={clsx("bg-muted border-input my-8 min-w-0 border", className)}
    >
      <div className="border-border flex items-center justify-between gap-4 border-b py-2 pl-5 pr-2">
        <span className="text-muted-foreground truncate text-xs uppercase">
          {label ?? ""}
        </span>
        <Button
          variant="muted"
          size="xxs"
          onClick={() => {
            navigator.clipboard
              .writeText(code)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <span aria-live="polite" className="sr-only">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </div>
      <pre className="font-code text-foreground my-0 overflow-x-auto border-0 bg-transparent px-5 py-4 text-sm leading-relaxed">
        <code className="font-code">{code}</code>
      </pre>
    </div>
  );
}
