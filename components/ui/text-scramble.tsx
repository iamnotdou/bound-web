"use client";
import { type JSX, useEffect, useState } from "react";
import { motion, MotionProps } from "motion/react";

const motionComponentCache = new Map<React.ElementType, React.ElementType>();

function getMotionComponent(component: React.ElementType): React.ElementType {
  let cached = motionComponentCache.get(component);
  if (!cached) {
    cached = motion.create(
      component as keyof JSX.IntrinsicElements,
    ) as React.ElementType;
    motionComponentCache.set(component, cached);
  }
  return cached;
}

export type TextScrambleProps = {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  as?: React.ElementType;
  className?: string;
  trigger?: boolean;
  onScrambleComplete?: () => void;
} & MotionProps;

const defaultChars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = defaultChars,
  className,
  as: Component = "p",
  trigger = true,
  onScrambleComplete,
  ...props
}: TextScrambleProps) {
  const MotionComponent = getMotionComponent(Component);
  const [displayText, setDisplayText] = useState(children);

  useEffect(() => {
    if (!trigger) return;

    const text = children;
    const steps = duration / speed;
    let step = 0;

    const interval = setInterval(() => {
      let scrambled = "";
      const progress = step / steps;

      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          scrambled += " ";
          continue;
        }

        if (progress * text.length > i) {
          scrambled += text[i];
        } else {
          scrambled +=
            characterSet[Math.floor(Math.random() * characterSet.length)];
        }
      }

      setDisplayText(scrambled);
      step++;

      if (step > steps) {
        clearInterval(interval);
        setDisplayText(text);
        onScrambleComplete?.();
      }
    }, speed * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    // eslint-disable-next-line react-hooks/static-components -- resolved from a module-level cache, stable across renders
    <MotionComponent className={className} {...props}>
      {displayText}
    </MotionComponent>
  );
}
