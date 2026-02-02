import type { EdgeTypes } from "@xyflow/react";
import { RelationshipEdge } from "./relationship-edge";

/** Custom edge types for React Flow — must be defined at module scope */
export const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
};
