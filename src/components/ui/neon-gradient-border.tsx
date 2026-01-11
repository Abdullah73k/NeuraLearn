"use client";

import { cn } from "@/lib/utils";

interface NeonGradientBorderProps {
  /**
   * Width of the border in pixels
   * @default 2
   */
  borderWidth?: number;
  /**
   * Colors for the neon gradient
   * @default { firstColor: "#ff00aa", secondColor: "#00FFF1" }
   */
  neonColors?: {
    firstColor: string;
    secondColor: string;
  };
  /**
   * Blur amount for the glow effect
   * @default 15
   */
  blurAmount?: number;
  /**
   * Optional className
   */
  className?: string;
}

/**
 * NeonGradientBorder
 *
 * A decorative neon gradient border effect that can be placed inside
 * a `relative` container to add a glowing gradient outline.
 *
 * Inspired by Magic UI's Neon Gradient Card component.
 * Uses absolutely positioned pseudo-element-like divs for the gradient
 * and blur layers.
 */
export function NeonGradientBorder({
  borderWidth = 2,
  neonColors = {
    firstColor: "#ff00aa",
    secondColor: "#00FFF1",
  },
  blurAmount = 15,
  className,
}: NeonGradientBorderProps) {
  return (
    <>
      {/* Gradient border layer */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] -z-10",
          className
        )}
        style={{
          padding: borderWidth,
          background: `linear-gradient(135deg, ${neonColors.firstColor}, ${neonColors.secondColor})`,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {/* Blur glow layer */}
      <div
        className={cn(
          "pointer-events-none absolute -z-20 rounded-[inherit] opacity-20",
          className
        )}
        style={{
          inset: -borderWidth,
          background: `linear-gradient(135deg, ${neonColors.firstColor}, ${neonColors.secondColor})`,
          filter: `blur(${blurAmount}px)`,
        }}
      />
    </>
  );
}
