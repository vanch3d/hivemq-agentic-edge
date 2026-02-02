import type { IconType } from "react-icons/lib";
import {
  LuPlug2,
  LuLink,
  LuTag,
  LuFilter,
  LuShield,
  LuFileText,
  LuFileCode2,
  LuMerge,
  LuRadioTower,
} from "react-icons/lu";

import type { DomainEntityType } from "./types";

// --- Entity icons (matching task plan spec) ---

export const ENTITY_ICONS: Record<DomainEntityType, IconType> = {
  adapter: LuPlug2, // Plug/connector
  bridge: LuLink, // Link/chain
  domainTag: LuTag, // Tag
  topicFilter: LuFilter, // Filter
  dataPolicy: LuShield, // Shield
  behaviorPolicy: LuShield, // Shield
  schema: LuFileText, // File/doc
  script: LuFileCode2, // Code file
  combiner: LuMerge, // Merge
  listener: LuRadioTower, // Antenna
};

// --- Entity colors (matching task plan spec) ---

export const ENTITY_COLORS: Record<DomainEntityType, string> = {
  adapter: "blue.500", // Blue — protocol adapter instance
  bridge: "orange.500", // Orange — MQTT bridge
  domainTag: "teal.400", // Teal — domain tag
  topicFilter: "green.400", // Light green — topic filter pattern
  dataPolicy: "purple.500", // Purple — data policy
  behaviorPolicy: "purple.500", // Purple — behavior policy
  schema: "purple.300", // Light purple — schema
  script: "purple.300", // Light purple — script (same family as schema)
  combiner: "yellow.500", // Yellow — combiner
  listener: "green.700", // Dark green — listener
};

export const ENTITY_LABELS: Record<DomainEntityType, string> = {
  adapter: "Adapter",
  bridge: "Bridge",
  domainTag: "Tag",
  topicFilter: "Topic Filter",
  dataPolicy: "Data Policy",
  behaviorPolicy: "Behavior Policy",
  schema: "Schema",
  script: "Script",
  combiner: "Combiner",
  listener: "Listener",
};

// --- Status colors ---

export const STATUS_COLORS: Record<string, string> = {
  CONNECTED: "green.400",
  STARTED: "green.400",
  DISCONNECTED: "gray.400",
  STOPPED: "gray.400",
  ERROR: "red.500",
  UNKNOWN: "transparent", // no accent dot
  STATELESS: "transparent", // no accent dot
};

// --- Node dimensions (for WebCola layout) ---

export const NODE_DIMENSIONS: Record<
  DomainEntityType,
  { width: number; height: number }
> = {
  adapter: { width: 160, height: 56 },
  bridge: { width: 160, height: 56 },
  domainTag: { width: 120, height: 40 },
  topicFilter: { width: 140, height: 40 },
  dataPolicy: { width: 140, height: 48 },
  behaviorPolicy: { width: 140, height: 48 },
  schema: { width: 120, height: 40 },
  script: { width: 120, height: 40 },
  combiner: { width: 120, height: 48 },
  listener: { width: 120, height: 40 },
};

export const DEFAULT_NODE_DIMENSIONS = { width: 140, height: 44 };

// --- Edge styles per relationship (matching task plan spec) ---

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

export const EDGE_STYLES: Record<string, EdgeStyle> = {
  // adapter → tag: Solid, teal
  hasTags: { stroke: "#14b8a6", strokeWidth: 1.5 },
  exposes: { stroke: "#14b8a6", strokeWidth: 1.5 },
  // tag → topic: Solid, green, arrow (northbound)
  publishesTo: { stroke: "#22c55e", strokeWidth: 2 },
  northbound: { stroke: "#22c55e", strokeWidth: 2 },
  // topic → tag: Dashed, green, arrow (southbound)
  writesTo: { stroke: "#22c55e", strokeWidth: 2, strokeDasharray: "6 3" },
  southbound: { stroke: "#22c55e", strokeWidth: 2, strokeDasharray: "6 3" },
  // topic → bridge: Solid, orange
  subscribes: { stroke: "#f97316", strokeWidth: 1.5 },
  // bridge → remoteBroker: Solid, orange, arrow
  forwards: { stroke: "#f97316", strokeWidth: 1.5 },
  // topicFilter → topic: Dotted, light green
  matches: { stroke: "#86efac", strokeWidth: 1.5, strokeDasharray: "2 3" },
  // policy → topic: Dotted, purple
  validates: { stroke: "#a855f7", strokeWidth: 1.5, strokeDasharray: "2 3" },
  // policy → schema: Dotted, light purple
  deserializes: {
    stroke: "#c084fc",
    strokeWidth: 1.5,
    strokeDasharray: "2 3",
  },
  uses: { stroke: "#c084fc", strokeWidth: 1.5, strokeDasharray: "2 3" },
  // policy → script: Dotted, light purple
  executes: { stroke: "#c084fc", strokeWidth: 1.5, strokeDasharray: "4 3" },
  // topic/tag → combiner: Solid, yellow
  combines: { stroke: "#eab308", strokeWidth: 1.5 },
  // combiner → topic/pulseAsset: Solid, yellow, arrow
  outputs: { stroke: "#eab308", strokeWidth: 1.5 },
};

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  stroke: "#94a3b8",
  strokeWidth: 1.5,
};

// --- Entity rank (layer ordering for directed layout) ---
// Lower rank = further upstream in the data flow.
// Nodes of rank N are constrained to appear before rank N+1 on the flow axis.

export const ENTITY_RANK: Record<DomainEntityType, number> = {
  listener: 0, // entry point
  adapter: 1, // connects to listeners, exposes tags
  domainTag: 2, // exposed by adapters
  topicFilter: 3, // tags publish to topics
  dataPolicy: 4, // policies match topic filters
  behaviorPolicy: 4,
  bridge: 4, // bridges subscribe to topics
  schema: 5, // used by policies
  script: 5, // executed by policies
  combiner: 5, // combines adapters/bridges
};

// --- Layout defaults ---

export const DEFAULT_LAYOUT_DIRECTION = "LR" as const;
export const NODE_SPACING = 40;
export const RANK_SPACING = 100;
