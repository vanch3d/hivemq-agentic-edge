import type { GraphNode, GraphEdge, LayoutDirection } from "./types";
import type { LayoutRequest, LayoutResult } from "./layout.worker";

let worker: Worker | null = null;
let requestId = 0;
let resultCallback: ((result: LayoutResult) => void) | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./layout.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<LayoutResult>) => {
      resultCallback?.(e.data);
    };
  }
  return worker;
}

/** Send a layout request to the worker. Returns the request id. */
export function requestLayout(opts: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  direction: LayoutDirection;
  spacingScale?: number;
}): number {
  const id = ++requestId;
  const msg: LayoutRequest = {
    id,
    nodes: opts.nodes,
    edges: opts.edges,
    direction: opts.direction,
    spacingScale: opts.spacingScale ?? 1,
  };
  getWorker().postMessage(msg);
  return id;
}

/** Register the callback invoked when the worker posts a result. */
export function onResult(cb: (result: LayoutResult) => void): void {
  resultCallback = cb;
}

/** Bump the request counter so any in-flight result is treated as stale. */
export function cancel(): void {
  requestId++;
}

/** Return the current (latest) request id. */
export function getLatestRequestId(): number {
  return requestId;
}
