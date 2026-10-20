"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const PAPER_WIDTH = 816; // US Letter at 96 dpi
const PAPER_HEIGHT = 1056;
// Narrower frames (phones) reflow the invoice instead of shrinking it to unreadable text.
const MIN_ZOOM_FRAME_WIDTH = 560;

/**
 * A sheet of US Letter paper. On wide screens it renders at true size and is scaled with CSS
 * `zoom` to fit its column, so the preview matches the printout exactly. Print styles in
 * globals.css undo the zoom, padding and shadow.
 */
export function PaperSheet({ children, className }: { children: ReactNode; className?: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // ResizeObserver also reports the initial size as soon as observation starts.
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setZoom(width >= MIN_ZOOM_FRAME_WIDTH ? Math.min(1, width / PAPER_WIDTH) : null);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className={cn("paper-frame", className)}>
      <div
        className="paper-sheet mx-auto rounded-[3px] bg-paper px-5 py-7 shadow-paper ring-1 ring-black/[0.04] sm:px-9 sm:py-10"
        style={
          zoom === null
            ? undefined
            : { width: PAPER_WIDTH, minHeight: PAPER_HEIGHT, padding: "56px 60px", zoom }
        }
      >
        {children}
      </div>
    </div>
  );
}
