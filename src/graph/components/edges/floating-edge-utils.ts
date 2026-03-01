/**
 * Utility functions for floating edges.
 *
 * Instead of fixed left/right handles, floating edges dynamically connect
 * to the closest side of each node based on relative position. This
 * produces cleaner edge routing for graphs where nodes are not strictly
 * left-to-right.
 *
 * Adapted from: https://reactflow.dev/examples/edges/simple-floating-edges
 */

import { Position, type InternalNode } from "@xyflow/react";

function getNodeCenter(node: InternalNode) {
  return {
    x: node.internals.positionAbsolute.x + (node.measured.width ?? 0) / 2,
    y: node.internals.positionAbsolute.y + (node.measured.height ?? 0) / 2,
  };
}

function getHandleCoords(
  node: InternalNode,
  handlePosition: Position,
): [number, number] {
  const w = node.measured.width ?? 0;
  const h = node.measured.height ?? 0;
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;

  switch (handlePosition) {
    case Position.Top:
      return [x + w / 2, y];
    case Position.Bottom:
      return [x + w / 2, y + h];
    case Position.Left:
      return [x, y + h / 2];
    case Position.Right:
      return [x + w, y + h / 2];
  }
}

function getClosestSide(
  nodeA: InternalNode,
  nodeB: InternalNode,
): Position {
  const centerA = getNodeCenter(nodeA);
  const centerB = getNodeCenter(nodeB);

  const dx = centerB.x - centerA.x;
  const dy = centerB.y - centerA.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Position.Right : Position.Left;
  }
  return dy > 0 ? Position.Bottom : Position.Top;
}

export function getFloatingEdgeParams(
  source: InternalNode,
  target: InternalNode,
) {
  const sourcePos = getClosestSide(source, target);
  const targetPos = getClosestSide(target, source);

  const [sx, sy] = getHandleCoords(source, sourcePos);
  const [tx, ty] = getHandleCoords(target, targetPos);

  return { sx, sy, tx, ty, sourcePos, targetPos };
}
