import { computeLayout } from "./layout";

import type { GraphNode, GraphEdge, LayoutDirection } from "./types";

/** Message sent from main thread to worker. */
export interface LayoutRequest {
  id: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  direction: LayoutDirection;
  spacingScale: number;
}

/** Message sent from worker back to main thread. */
export interface LayoutResult {
  id: number;
  nodes: GraphNode[];
}

self.onmessage = (e: MessageEvent<LayoutRequest>) => {
  const { id, nodes, edges, direction, spacingScale } = e.data;
  const result = computeLayout(nodes, edges, direction, spacingScale);
  self.postMessage({ id, nodes: result } satisfies LayoutResult);
};
