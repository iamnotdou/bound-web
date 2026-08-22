"use client";

/**
 * A button that will not let you sign into a refusal.
 *
 * Every capital action in the app goes through this. It takes a `Gate` rather
 * than a `disabled` boolean, because a disabled button that does not say why is
 * a dead end — the visitor is left guessing whether they are missing USDC, on
 * the wrong wallet, or looking at a certificate somebody else owns. The reason
 * is rendered beside the button, from the same table the server gates with.
 *
 * A gate that has not been read yet is not the same as a closed one. While the
 * wallet is still loading the button waits rather than claiming a refusal it
 * has not computed.
 */
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { Gate } from "@/lib/preconditions";
import { cn } from "@/lib/utils";

export interface ActionButtonProps extends Omit<
  ButtonProps,
  "disabled" | "children"
> {
  gate: Gate | null;
  /** True while the gate's inputs are still being fetched. */
  checking?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
  /**
   * A reason the gate cannot know, rendered in its place — an empty amount
   * field, a figure above the wallet's balance, an unreadable vault.
   *
   * It **disables the button** as well as explaining it. Every one of these is
   * a reason the action cannot succeed, so leaving the button live only buys a
   * click that returns early and says nothing — which is the same dead end the
   * gate's own reason exists to prevent.
   */
  reasonOverride?: string | null;
}

export function ActionButton({
  gate,
  checking = false,
  pending = false,
  pendingLabel = "Waiting for your wallet…",
  children,
  reasonOverride,
  className,
  type = "button",
  ...props
}: ActionButtonProps) {
  const blocked = gate !== null && !gate.ok;
  const reason = reasonOverride ?? (blocked ? gate.reason : null);
  const disabled =
    pending || checking || gate === null || blocked || reasonOverride != null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Button type={type} disabled={disabled} {...props}>
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {pending ? pendingLabel : children}
        </Button>
        {checking ? (
          <span className="text-muted-foreground text-sm">
            Reading this wallet…
          </span>
        ) : null}
      </div>
      {reason ? (
        <p className="text-muted-foreground max-w-prose text-sm" role="status">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The failure after the click.
 *
 * When the server recognised the error there is a sentence and the raw string;
 * when it did not there is only the raw string, and it is labelled as raw so
 * the reader knows nobody has interpreted it. The action and the certificate id
 * sit beside it, because a bare `HostError` with no context is unactionable
 * even for someone who could read it.
 */
export function ActionFailure({
  title,
  message,
  raw,
  recognised,
  action,
  certId,
  hint,
}: {
  title: string;
  message: string;
  raw?: string | null;
  recognised: boolean;
  action: string;
  certId?: number | null;
  hint?: string;
}) {
  const showRaw = raw != null && raw !== "" && (!recognised || raw !== message);

  return (
    <div
      role="alert"
      className="ring-destructive/30 bg-destructive/5 mt-6 rounded-xl p-5 ring-1"
    >
      <h3 className="text-destructive text-sm font-semibold">{title}</h3>
      <p className="text-foreground mt-2 break-words text-sm">{message}</p>
      {hint ? (
        <p className="text-muted-foreground mt-2 text-sm">{hint}</p>
      ) : null}
      {showRaw ? (
        <details className="mt-3">
          <summary className="text-muted-foreground cursor-pointer text-xs">
            {recognised
              ? "The chain's own words"
              : "Unrecognised — this is the raw error, uninterpreted"}
          </summary>
          <p className="text-muted-foreground mt-1 text-xs">
            {action}
            {certId != null ? ` · certificate #${certId}` : ""}
          </p>
          <pre className="text-muted-foreground mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
            {raw}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
