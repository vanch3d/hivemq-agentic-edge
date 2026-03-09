/**
 * Lightweight adjacency index built from flat node/edge arrays.
 * Shared by all clustering rules to avoid redundant traversals.
 */
import type { GraphNode, GraphEdge } from "../types";

export interface GraphIndex {
  /** node ID → GraphNode */
  nodeById: Map<string, GraphNode>;
  /** node ID → outgoing edges */
  outgoing: Map<string, GraphEdge[]>;
  /** node ID → incoming edges */
  incoming: Map<string, GraphEdge[]>;
  /** entity type → node IDs */
  byType: Map<string, string[]>;
}

export function buildGraphIndex(
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphIndex {
  const nodeById = new Map<string, GraphNode>();
  const outgoing = new Map<string, GraphEdge[]>();
  const incoming = new Map<string, GraphEdge[]>();
  const byType = new Map<string, string[]>();

  for (const n of nodes) {
    nodeById.set(n.id, n);
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
    const list = byType.get(n.data.entityType);
    if (list) list.push(n.id);
    else byType.set(n.data.entityType, [n.id]);
  }

  for (const e of edges) {
    outgoing.get(e.source)?.push(e);
    incoming.get(e.target)?.push(e);
  }

  return { nodeById, outgoing, incoming, byType };
}
