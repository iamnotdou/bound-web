"use client";

import { Blobatar } from "@blobatar/react";
import "blobatar/motion.css";
import { cn } from "@/lib/utils";

/**
 * A face for a Stellar address.
 *
 * The blobatar is derived from the address itself, so it carries no claim the
 * chain does not already make: it is the same 56 characters, drawn. Two cards
 * showing the same agent show the same face, and no two agents can be given
 * the same one by mistake, which is the whole of what it is for — scanning a
 * grid for an agent you have seen before, without reading truncated base32.
 *
 * It is decorative in the accessibility sense, and deliberately so. The
 * address is always rendered next to it, so the picture repeats what the text
 * says and a screen reader that announced it would only be reading a hash
 * twice. `Blobatar` marks itself `aria-hidden`/`alt=""` when given no `title`,
 * which is what we want here.
 *
 * `animate` opts a blobatar into the motion layer, which renders inline SVG
 * (about a dozen nodes) instead of one `<img>`. Worth it for the avatar a card
 * is about; not worth it for the auditor's thumbnail next to it.
 */
export function AgentAvatar({
  address,
  size = 44,
  animate = false,
  className,
}: {
  address: string;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  const common = {
    name: address,
    size,
    background: "squircle" as const,
    className: cn("shrink-0", className),
  };

  // Two calls rather than `animate={animate ? "hover" : undefined}`: the prop
  // is a discriminated union — `onLoad` stops type-checking the moment motion
  // is on, because it stops firing — and `"hover" | undefined` satisfies
  // neither arm of it.
  return animate ? (
    <Blobatar {...common} animate="hover" />
  ) : (
    <Blobatar {...common} />
  );
}
