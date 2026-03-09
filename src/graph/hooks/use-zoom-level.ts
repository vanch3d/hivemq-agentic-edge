import { useStore } from "@xyflow/react";

/**
 * Node detail level driven by viewport zoom.
 *
 * - "dot":     zoom < 0.4 — colored shape only, no text
 * - "compact": zoom 0.4–0.8 — label only, no badge/sublabel/children
 * - "full":    zoom > 0.8 — full rendering
 */
export type ZoomDetail = "dot" | "compact" | "full";

const ZOOM_COMPACT = 0.4;
const ZOOM_FULL = 0.8;

/** Selector that maps zoom → detail level (avoids re-renders on pan). */
function zoomToDetail(zoom: number): ZoomDetail {
  if (zoom < ZOOM_COMPACT) return "dot";
  if (zoom < ZOOM_FULL) return "compact";
  return "full";
}

/**
 * Subscribe to the current zoom-based detail level.
 * Only triggers re-render when the detail level *changes*, not on every zoom tick.
 */
export function useZoomDetail(): ZoomDetail {
  return useStore(
    (s) => zoomToDetail(s.transform[2]),
    // Custom equality — only re-render when the detail bucket changes
    (a, b) => a === b,
  );
}
