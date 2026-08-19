"use client";

import { useEffect, useState } from "react";
import PixelBlast from "@/components/PixelBlast";

export function PixelBlastBackground() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const smallScreen = window.matchMedia("(max-width: 1023px)");

    const update = () =>
      setEnabled(!reducedMotion.matches && !smallScreen.matches);

    update();
    reducedMotion.addEventListener("change", update);
    smallScreen.addEventListener("change", update);
    return () => {
      reducedMotion.removeEventListener("change", update);
      smallScreen.removeEventListener("change", update);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 size-full">
      <PixelBlast
        variant="square"
        color="#FF5400"
        className=""
        style={undefined}
        pixelSize={4}
        patternDensity={1}
        speed={0.5}
        edgeFade={0}
        transparent
      />
    </div>
  );
}
