import createDebug from "debug";
import * as cola from "webcola";

import type { GraphNode, GraphEdge, LayoutDirection } from "./types";
import {
  NODE_DIMENSIONS,
  DEFAULT_NODE_DIMENSIONS,
  ENTITY_RANK,
  RANK_SPACING,
  NODE_SPACING,
} from "./constants";

const log = createDebug("edge:graph:layout");

/**
 * Above this node count, skip the WebCola refinement phase and use
 * the rank-grid positions directly. The grid produces acceptable results
 * and is O(V+E), while WebCola's constraint solver is O(V²) per iteration.
 */
const GRID_ONLY_THRESHOLD = 300;

/**
 * Compute graph layout using a two-phase approach:
 *
 * 1. **Rank grid** — Group nodes by ENTITY_RANK, order within each rank
 *    via a barycenter heuristic to reduce edge crossings. This produces
 *    well-spaced initial positions in O(V + E).
 *
 * 2. **WebCola refinement** — Run a short force-directed simulation that
 *    pulls connected nodes together for organic clustering. Uses the
 *    rank-grid positions as seeds so few iterations are needed.
 *    `avoidOverlaps` is OFF (it was O(n²) per iteration and caused
 *    multi-second freezes). Overlap is already handled by the grid seed.
 *
 * Pure function — does not mutate inputs.
 */
export function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: LayoutDirection,
  spacingScale = 1,
): GraphNode[] {
  if (nodes.length === 0) return [];

  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: 0, y: 0 } }];
  }

  log("input: %d nodes, %d edges, direction=%s", nodes.length, edges.length, direction);

  const isLR = direction === "LR";
  const flowAxis = isLR ? "x" : "y";

  // Scale spacing for sparser graphs (e.g. schema view)
  const nodeSpacing = NODE_SPACING * spacingScale;
  const rankSpacing = RANK_SPACING * spacingScale;

  // ── Phase 1: Rank grid with barycenter ordering ─────────────────────

  const rankGroups = new Map<number, number[]>();
  nodes.forEach((n, i) => {
    const rank = ENTITY_RANK[n.data.entityType];
    if (!rankGroups.has(rank)) rankGroups.set(rank, []);
    rankGroups.get(rank)!.push(i);
  });
  const sortedRanks = [...rankGroups.keys()].sort((a, b) => a - b);

  // Build adjacency
  const adj = new Map<number, number[]>();
  nodes.forEach((_, i) => adj.set(i, []));
  const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));
  for (const e of edges) {
    const si = nodeIndexMap.get(e.source);
    const ti = nodeIndexMap.get(e.target);
    if (si !== undefined && ti !== undefined) {
      adj.get(si)!.push(ti);
      adj.get(ti)!.push(si);
    }
  }

  // Barycenter ordering (forward + backward pass)
  const slot = new Float64Array(nodes.length);
  for (const rank of sortedRanks) {
    rankGroups.get(rank)!.forEach((idx, s) => {
      slot[idx] = s;
    });
  }

  function barycentricSort(ri: number, neighborRanks: number[]) {
    const group = rankGroups.get(sortedRanks[ri])!;
    const nbrSet = new Set<number>();
    for (const nri of neighborRanks) {
      for (const idx of rankGroups.get(sortedRanks[nri])!) nbrSet.add(idx);
    }
    const bary = group.map((nodeIdx) => {
      const nbrs = adj.get(nodeIdx)!.filter((n) => nbrSet.has(n));
      if (nbrs.length === 0) return { nodeIdx, avg: slot[nodeIdx] };
      return {
        nodeIdx,
        avg: nbrs.reduce((s, n) => s + slot[n], 0) / nbrs.length,
      };
    });
    bary.sort((a, b) => a.avg - b.avg);
    const sorted = bary.map((b) => b.nodeIdx);
    sorted.forEach((idx, s) => {
      slot[idx] = s;
    });
    rankGroups.set(sortedRanks[ri], sorted);
  }

  // Forward pass
  for (let ri = 1; ri < sortedRanks.length; ri++) {
    const prev = Array.from({ length: ri }, (_, i) => i);
    barycentricSort(ri, prev);
  }
  // Backward pass
  for (let ri = sortedRanks.length - 2; ri >= 0; ri--) {
    const next = Array.from(
      { length: sortedRanks.length - ri - 1 },
      (_, i) => ri + 1 + i,
    );
    barycentricSort(ri, next);
  }

  // Compute grid positions
  const rankCrossExtent = new Map<number, number>();
  for (const rank of sortedRanks) {
    let extent = 0;
    for (const idx of rankGroups.get(rank)!) {
      const d =
        NODE_DIMENSIONS[nodes[idx].data.entityType] ?? DEFAULT_NODE_DIMENSIONS;
      extent += (isLR ? d.height : d.width) + nodeSpacing;
    }
    rankCrossExtent.set(rank, extent - nodeSpacing);
  }
  const maxCross = Math.max(...rankCrossExtent.values(), 0);

  // Seed positions: colaNodes[i].x / .y
  interface ColaNode {
    index: number;
    width: number;
    height: number;
    x: number;
    y: number;
  }

  const colaNodes: ColaNode[] = nodes.map((n, i) => {
    const d = NODE_DIMENSIONS[n.data.entityType] ?? DEFAULT_NODE_DIMENSIONS;
    return { index: i, width: d.width + 20, height: d.height + 20, x: 0, y: 0 };
  });

  let flowPos = 0;
  for (const rank of sortedRanks) {
    const group = rankGroups.get(rank)!;
    const crossExtent = rankCrossExtent.get(rank)!;
    const crossOffset = (maxCross - crossExtent) / 2;
    let crossPos = crossOffset;
    let maxFlowDim = 0;

    for (const idx of group) {
      const d =
        NODE_DIMENSIONS[nodes[idx].data.entityType] ?? DEFAULT_NODE_DIMENSIONS;
      if (isLR) {
        colaNodes[idx].x = flowPos + d.width / 2;
        colaNodes[idx].y = crossPos + d.height / 2;
        crossPos += d.height + nodeSpacing;
        maxFlowDim = Math.max(maxFlowDim, d.width);
      } else {
        colaNodes[idx].x = crossPos + d.width / 2;
        colaNodes[idx].y = flowPos + d.height / 2;
        crossPos += d.width + nodeSpacing;
        maxFlowDim = Math.max(maxFlowDim, d.height);
      }
    }
    flowPos += maxFlowDim + rankSpacing;
  }

  // ── Phase 2: WebCola refinement (skipped for large graphs) ─────────

  if (nodes.length <= GRID_ONLY_THRESHOLD) {
    const colaLinks = edges
      .map((e) => ({
        source: nodeIndexMap.get(e.source),
        target: nodeIndexMap.get(e.target),
      }))
      .filter(
        (l): l is { source: number; target: number } =>
          l.source !== undefined && l.target !== undefined,
      );

    // Rank separation constraints
    interface RankConstraint {
      axis: string;
      left: number;
      right: number;
      gap: number;
    }

    const constraints: RankConstraint[] = [];
    const constraintSet = new Set<string>();

    for (const link of colaLinks) {
      const sr = ENTITY_RANK[nodes[link.source].data.entityType];
      const tr = ENTITY_RANK[nodes[link.target].data.entityType];
      if (sr === tr) continue;
      const [left, right] =
        sr < tr ? [link.source, link.target] : [link.target, link.source];
      const key = `${left}-${right}`;
      if (constraintSet.has(key)) continue;
      constraintSet.add(key);
      constraints.push({ axis: flowAxis, left, right, gap: rankSpacing });
    }

    // Inter-rank representative constraints
    for (let ri = 0; ri < sortedRanks.length - 1; ri++) {
      const leftGroup = rankGroups.get(sortedRanks[ri])!;
      const rightGroup = rankGroups.get(sortedRanks[ri + 1])!;
      const key = `${leftGroup[0]}-${rightGroup[0]}`;
      if (!constraintSet.has(key)) {
        constraintSet.add(key);
        constraints.push({
          axis: flowAxis,
          left: leftGroup[0],
          right: rightGroup[0],
          gap: rankSpacing,
        });
      }
    }

    log("cola: %d constraints, %d links", constraints.length, colaLinks.length);

    const colaLayout = new cola.Layout()
      .size([800, 600])
      .nodes(colaNodes as unknown as cola.Node[])
      .links(colaLinks as unknown as cola.Link<cola.Node | number>[])
      .constraints(constraints as unknown[] as cola.Constraint[])
      .symmetricDiffLinkLengths(rankSpacing * 0.6)
      .convergenceThreshold(0.3);

    colaLayout.start(3, 5, 3);
  } else {
    log("skipping WebCola refinement: %d nodes > threshold %d", nodes.length, GRID_ONLY_THRESHOLD);
  }

  // ── Extract final positions ─────────────────────────────────────────

  return nodes.map((n, i) => {
    const d = NODE_DIMENSIONS[n.data.entityType] ?? DEFAULT_NODE_DIMENSIONS;
    return {
      ...n,
      position: {
        x: colaNodes[i].x - d.width / 2,
        y: colaNodes[i].y - d.height / 2,
      },
    };
  });
}
