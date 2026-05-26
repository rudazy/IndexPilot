import type { ReactNode } from "react";
import { DarkGradientBg } from "@/components/ui/elegant-dark-pattern";
import { FloatingPaths } from "@/components/ui/background-paths";

// Site-wide background. Layers, bottom to top:
//   1. DarkGradientBg  — dark wash, cyan streaks, noise + dot grid texture
//   2. FloatingPaths   — animated SVG path field at 0.4 opacity
//   3. App content     — every page renders inside here, above both layers
//
// Wraps the whole app from app/layout.tsx, so each route inherits the same
// background with no per-page changes.
export function SiteBackground({ children }: { children: ReactNode }) {
  return (
    <DarkGradientBg className="flex min-h-screen flex-col">
      {/* Animated SVG layer — non-interactive, sits behind content (z-0). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* App content, above every background layer. */}
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </DarkGradientBg>
  );
}
