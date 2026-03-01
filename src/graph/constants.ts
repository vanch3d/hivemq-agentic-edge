import type { IconType } from "react-icons/lib";
import {
  LuPlug2,
  LuLink,
  LuTag,
  LuFilter,
  LuShield,
  LuShieldCheck,
  LuFileText,
  LuFileCode2,
  LuMerge,
  LuRadioTower,
  LuServer,
  LuCloud,
  LuCpu,
  LuMessageSquare,
  LuArrowUpRight,
  LuArrowDownLeft,
  LuArrowLeftRight,
} from "react-icons/lu";

import type { DomainEntityType } from "./types";

// --- Entity icons (matching task plan spec) ---

export const ENTITY_ICONS: Record<DomainEntityType, IconType> = {
  // v1
  adapter: LuPlug2,
  bridge: LuLink,
  domainTag: LuTag,
  topicFilter: LuFilter,
  dataPolicy: LuShield,
  behaviorPolicy: LuShield,
  schema: LuFileText,
  script: LuFileCode2,
  combiner: LuMerge,
  listener: LuRadioTower,
  // v2
  edgeBroker: LuServer,
  dataHub: LuShieldCheck,
  pulse: LuCloud,
  remoteBroker: LuServer,
  otDevice: LuCpu,
  tag: LuTag,
  topic: LuMessageSquare,
  northboundMapper: LuArrowUpRight,
  southboundMapper: LuArrowDownLeft,
  assetMapper: LuMerge,
  bridgeSubscription: LuArrowLeftRight,
};

// --- Entity colors (matching task plan spec) ---

export const ENTITY_COLORS: Record<DomainEntityType, string> = {
  // v1
  adapter: "blue.500",
  bridge: "orange.500",
  domainTag: "teal.400",
  topicFilter: "green.400",
  dataPolicy: "purple.500",
  behaviorPolicy: "purple.500",
  schema: "purple.300",
  script: "purple.300",
  combiner: "yellow.500",
  listener: "green.700",
  // v2
  edgeBroker: "cyan.600",
  dataHub: "purple.600",
  pulse: "sky.500",
  remoteBroker: "orange.300",
  otDevice: "blue.300",
  tag: "teal.400",
  topic: "green.500",
  northboundMapper: "green.600",
  southboundMapper: "green.600",
  assetMapper: "sky.500",
  bridgeSubscription: "orange.400",
};

export const ENTITY_LABELS: Record<DomainEntityType, string> = {
  // v1
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
  // v2
  edgeBroker: "Edge Broker",
  dataHub: "DataHub",
  pulse: "Pulse",
  remoteBroker: "Remote Broker",
  otDevice: "OT Device",
  tag: "Tag",
  topic: "Topic",
  northboundMapper: "NB Mapper",
  southboundMapper: "SB Mapper",
  assetMapper: "Asset Mapper",
  bridgeSubscription: "Bridge Sub",
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
  // v1
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
  // v2
  edgeBroker: { width: 160, height: 56 },
  dataHub: { width: 160, height: 56 },
  pulse: { width: 140, height: 48 },
  remoteBroker: { width: 160, height: 56 },
  otDevice: { width: 140, height: 48 },
  tag: { width: 120, height: 40 },
  topic: { width: 160, height: 40 },
  northboundMapper: { width: 140, height: 40 },
  southboundMapper: { width: 140, height: 40 },
  assetMapper: { width: 140, height: 48 },
  bridgeSubscription: { width: 140, height: 40 },
};

export const DEFAULT_NODE_DIMENSIONS = { width: 140, height: 44 };

// --- Edge styles per relationship (matching task plan spec) ---

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

export const EDGE_STYLES: Record<string, EdgeStyle> = {
  // Adapter → OT Device: Solid, blue
  manages: { stroke: "var(--graph-edge-blue)", strokeWidth: 1.5 },
  // OT Device → Tag: Solid, teal
  exposes: { stroke: "var(--graph-edge-teal)", strokeWidth: 1.5 },
  // Structural ownership: Solid, gray, thin
  owns: { stroke: "var(--graph-edge-default)", strokeWidth: 1 },
  // Bridge → Remote Broker: Solid, orange
  connectsTo: { stroke: "var(--graph-edge-orange)", strokeWidth: 1.5 },
  // Tag/TopicFilter → Mapper: Solid, green (data input)
  feeds: { stroke: "var(--graph-edge-green)", strokeWidth: 2 },
  // Mapper/Combiner → Topic: Solid, green (data output)
  publishes: { stroke: "var(--graph-edge-green)", strokeWidth: 2 },
  // SB Mapper → Tag: Dashed, green (southbound write)
  writes: { stroke: "var(--graph-edge-green-dash)", strokeWidth: 2, strokeDasharray: "6 3" },
  // BridgeSubscription → TopicFilter: Solid, orange
  filters: { stroke: "var(--graph-edge-orange)", strokeWidth: 1.5 },
  // BridgeSubscription → Topic: Solid, orange
  delivers: { stroke: "var(--graph-edge-orange)", strokeWidth: 1.5 },
  // Adapter/Bridge → Combiner: Solid, yellow
  sources: { stroke: "var(--graph-edge-yellow)", strokeWidth: 1.5 },
  // DataPolicy → TopicFilter: Dotted, purple
  attachedTo: { stroke: "var(--graph-edge-purple)", strokeWidth: 1.5, strokeDasharray: "2 3" },
  // DataPolicy → Schema: Dotted, purple
  validates: { stroke: "var(--graph-edge-purple)", strokeWidth: 1.5, strokeDasharray: "2 3" },
  // Policy → Script: Dashed, light purple
  executes: { stroke: "var(--graph-edge-purple-light)", strokeWidth: 1.5, strokeDasharray: "4 3" },
  // DataPolicy → Topic (redirect): Dashed, purple
  redirects: { stroke: "var(--graph-edge-purple)", strokeWidth: 1.5, strokeDasharray: "4 3" },
  // BehaviorPolicy → Schema: Dotted, light purple
  deserializes: { stroke: "var(--graph-edge-purple-light)", strokeWidth: 1.5, strokeDasharray: "2 3" },
  // TopicFilter → Topic: Dotted, light green
  matches: { stroke: "var(--graph-edge-green-light)", strokeWidth: 1.5, strokeDasharray: "2 3" },
};

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  stroke: "var(--graph-edge-default)",
  strokeWidth: 1.5,
};

// --- Entity rank (layer ordering for directed layout) ---
// Lower rank = further upstream (leftward in LR mode).
// The data flow reads left-to-right:
//   OT Device → Adapter → Tag → Mappers → Edge Broker / Topics →
//   DataHub / Policies → Schemas/Scripts → Bridge → Remote Broker

export const ENTITY_RANK: Record<DomainEntityType, number> = {
  // Layer 0 — Connectors (entry points, leftmost in LR)
  adapter: 0,           // OT connector
  bridge: 0,            // IT connector
  listener: 0,          // v1 infrastructure
  // Layer 1 — What connectors connect to
  otDevice: 1,          // adapter → device
  remoteBroker: 1,      // bridge → remote broker
  bridgeSubscription: 1,
  // Layer 2 — Data points
  domainTag: 2,         // v1 tag
  tag: 2,               // v2 tag (exposed by device)
  // Layer 3 — Transforms & aggregation
  northboundMapper: 3,  // tag → topic
  southboundMapper: 3,  // topicFilter → tag
  combiner: 3,          // aggregates sources → topic
  assetMapper: 3,
  // Layer 4 — Central messaging
  edgeBroker: 4,        // local MQTT broker
  topic: 4,             // broker's topics
  topicFilter: 4,       // broker's filters
  pulse: 4,             // cloud platform
  // Layer 5 — Policy engine
  dataHub: 5,
  // Layer 6 — Policies
  dataPolicy: 6,
  behaviorPolicy: 6,
  // Layer 7 — Resources (rightmost)
  schema: 7,
  script: 7,
};

// --- Layout defaults ---

export const DEFAULT_LAYOUT_DIRECTION = "LR" as const;
export const NODE_SPACING = 20;
export const RANK_SPACING = 60;
