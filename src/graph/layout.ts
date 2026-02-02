import * as cola from "webcola";

import type { GraphNode, GraphEdge, LayoutDirection } from "./types";
import {
  NODE_DIMENSIONS,
  DEFAULT_NODE_DIMENSIONS,
  ENTITY_RANK,
  RANK_SPACING,
} from "./constants";

interface ColaNode {
  index: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Compute graph layout using WebCola's constraint-based engine.
 *
 * Instead of relying on `flowLayout` (which derives direction from edge
 * source→target), we assign each entity type a **rank** and add explicit
 * separation constraints so that upstream types always appear before
 * downstream types on the flow axis — regardless of which direction the
 * semantic edge points.
 *
 * Returns a new array of nodes with updated positions.
 * Pure function — does not mutate inputs.
 */
export function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: LayoutDirection,
): GraphNode[] {
  if (nodes.length === 0) return [];

  // Single node — center it
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: 0, y: 0 } }];
  }

  const flowAxis = direction === "LR" ? "x" : "y";

  // Build webcola nodes
  const colaNodes: ColaNode[] = nodes.map((n, i) => {
    const dims = NODE_DIMENSIONS[n.data.entityType] ?? DEFAULT_NODE_DIMENSIONS;
    return {
      index: i,
      width: dims.width + 20,
      height: dims.height + 20,
      x: 0,
      y: 0,
    };
  });

  // Build index map for edge resolution
  const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));

  const colaLinks = edges
    .map((e) => ({
      source: nodeIndexMap.get(e.source),
      target: nodeIndexMap.get(e.target),
    }))
    .filter(
      (l): l is { source: number; target: number } =>
        l.source !== undefined && l.target !== undefined,
    );

  // --- Rank-based separation constraints ---
  // For each edge, enforce that the lower-ranked entity type is positioned
  // before the higher-ranked one on the flow axis. Edges between nodes of
  // the same rank get no flow constraint (they spread freely on the cross axis).
  // WebCola's TS definitions type left/right as Variable, but the runtime
  // engine accepts plain node indices (numbers). We build plain objects and
  // cast when passing to the layout engine.
  interface RankConstraint {
    axis: string;
    left: number;
    right: number;
    gap: number;
  }

  const constraints: RankConstraint[] = [];
  const constraintSet = new Set<string>();

  for (const link of colaLinks) {
    const sourceRank = ENTITY_RANK[nodes[link.source].data.entityType];
    const targetRank = ENTITY_RANK[nodes[link.target].data.entityType];

    if (sourceRank === targetRank) continue;

    // Determine which node is upstream (lower rank) and downstream (higher rank)
    const [left, right] =
      sourceRank < targetRank
        ? [link.source, link.target]
        : [link.target, link.source];

    const key = `${left}-${right}`;
    if (constraintSet.has(key)) continue;
    constraintSet.add(key);

    constraints.push({
      axis: flowAxis,
      left,
      right,
      gap: RANK_SPACING,
    });
  }

  // Also add rank constraints between nodes that share no edge but belong
  // to different ranks — prevents unconnected nodes from drifting into the
  // wrong layer. We only need one representative pair per rank pair.
  const nodesByRank = new Map<number, number[]>();
  nodes.forEach((n, i) => {
    const rank = ENTITY_RANK[n.data.entityType];
    if (!nodesByRank.has(rank)) nodesByRank.set(rank, []);
    nodesByRank.get(rank)!.push(i);
  });

  const ranks = [...nodesByRank.keys()].sort((a, b) => a - b);
  for (let ri = 0; ri < ranks.length - 1; ri++) {
    const leftNodes = nodesByRank.get(ranks[ri])!;
    const rightNodes = nodesByRank.get(ranks[ri + 1])!;
    const key = `${leftNodes[0]}-${rightNodes[0]}`;
    if (!constraintSet.has(key)) {
      constraintSet.add(key);
      constraints.push({
        axis: flowAxis,
        left: leftNodes[0],
        right: rightNodes[0],
        gap: RANK_SPACING,
      });
    }
  }

  // Run layout with explicit constraints instead of flowLayout
  const colaLayout = new cola.Layout()
    .size([800, 600])
    .nodes(colaNodes as unknown as cola.Node[])
    .links(colaLinks as unknown as cola.Link<cola.Node | number>[])
    .constraints(constraints as unknown[] as cola.Constraint[])
    .symmetricDiffLinkLengths(RANK_SPACING)
    .avoidOverlaps(true)
    .convergenceThreshold(0.01);

  colaLayout.start(50, 30, 20);

  // Extract positions
  return nodes.map((node, i) => {
    const dims =
      NODE_DIMENSIONS[node.data.entityType] ?? DEFAULT_NODE_DIMENSIONS;
    return {
      ...node,
      position: {
        x: colaNodes[i].x - dims.width / 2,
        y: colaNodes[i].y - dims.height / 2,
      },
    };
  });
}
