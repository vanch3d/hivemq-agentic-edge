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
  LuPlay,
  LuGitBranch,
  LuCheck,
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
  // Policy internals
  pipelineOperation: LuPlay,
  fsmTransition: LuGitBranch,
  validator: LuCheck,
};

// --- Entity roles (taxonomy-based grouping for visual identity) ---

export type VisualRole =
  | "orchestrator" // singletons that manage subsystems (edgeBroker, dataHub, pulse)
  | "connector" // entry-point devices/bridges (adapter, bridge, listener)
  | "endpoint" // remote targets of connectors (otDevice, remoteBroker)
  | "resource" // high-cardinality data points (tag, domainTag, topic, topicFilter)
  | "mapper" // data transforms (northbound/southbound/assetMapper, combiner, bridgeSubscription)
  | "policy" // governance rules (dataPolicy, behaviorPolicy)
  | "artifact"; // supporting files (schema, script)

export const VISUAL_ROLE: Record<DomainEntityType, VisualRole> = {
  // Orchestrators — singletons
  edgeBroker: "orchestrator",
  dataHub: "orchestrator",
  pulse: "orchestrator",
  // Connectors — entry points
  adapter: "connector",
  bridge: "connector",
  listener: "connector",
  // Endpoints — what connectors connect to
  otDevice: "endpoint",
  remoteBroker: "endpoint",
  // Resources — high-cardinality
  tag: "resource",
  domainTag: "resource",
  topic: "resource",
  topicFilter: "resource",
  // Mappers — data transforms
  northboundMapper: "mapper",
  southboundMapper: "mapper",
  assetMapper: "mapper",
  combiner: "mapper",
  bridgeSubscription: "mapper",
  // Policies — governance
  dataPolicy: "policy",
  behaviorPolicy: "policy",
  // Artifacts — supporting files
  schema: "artifact",
  script: "artifact",
  // Policy internals — same visual role as artifacts (small, supporting)
  pipelineOperation: "artifact",
  fsmTransition: "artifact",
  validator: "artifact",
};

// --- Entity colors (role-based, max perceptual distance between roles) ---
// At dot-zoom level, color is the ONLY discriminator.
// Palette chosen for maximum separation across roles:
//   connector    = blue (strong, saturated)
//   endpoint     = teal/cyan
//   resource     = green (high-cardinality → calm)
//   mapper       = orange
//   policy       = purple
//   artifact     = gray
//   orchestrator = pink accent (distinctive singleton)
//
// ENTITY_COLORS: specific shade tokens for borders & legend icons.
// ENTITY_COLOR_PALETTE: Chakra colorPalette name — used by Badge variant="solid"
//   to guarantee WCAG-AA contrast automatically.

export const ENTITY_COLORS: Record<DomainEntityType, string> = {
  // Connectors — blue
  adapter: "blue.500",
  bridge: "blue.600",
  listener: "blue.400",
  // Endpoints — teal/cyan
  otDevice: "teal.500",
  remoteBroker: "cyan.600",
  // Resources — green
  tag: "green.500",
  domainTag: "green.500",
  topic: "green.500",
  topicFilter: "green.600",
  // Mappers — orange
  northboundMapper: "orange.500",
  southboundMapper: "orange.500",
  assetMapper: "orange.400",
  combiner: "orange.600",
  bridgeSubscription: "orange.400",
  // Policies — purple
  dataPolicy: "purple.500",
  behaviorPolicy: "purple.500",
  // Artifacts — gray
  schema: "gray.500",
  script: "gray.500",
  // Orchestrators — pink accent (singletons)
  edgeBroker: "pink.500",
  dataHub: "pink.600",
  pulse: "pink.400",
  // Policy internals — purple (lighter shades, subordinate to policies)
  pipelineOperation: "purple.300",
  fsmTransition: "purple.400",
  validator: "purple.300",
};

/** Chakra colorPalette name — used by Badge `colorPalette` + `variant="solid"` for auto contrast. */
export type ChakraColorPalette =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "cyan"
  | "purple"
  | "pink";

export const ENTITY_COLOR_PALETTE: Record<
  DomainEntityType,
  ChakraColorPalette
> = {
  // Connectors — blue
  adapter: "blue",
  bridge: "blue",
  listener: "blue",
  // Endpoints — teal/cyan
  otDevice: "teal",
  remoteBroker: "cyan",
  // Resources — green (badges hidden, but included for completeness)
  tag: "green",
  domainTag: "green",
  topic: "green",
  topicFilter: "green",
  // Mappers — orange
  northboundMapper: "orange",
  southboundMapper: "orange",
  assetMapper: "orange",
  combiner: "orange",
  bridgeSubscription: "orange",
  // Policies — purple
  dataPolicy: "purple",
  behaviorPolicy: "purple",
  // Artifacts — gray
  schema: "gray",
  script: "gray",
  // Orchestrators — pink
  edgeBroker: "pink",
  dataHub: "pink",
  pulse: "pink",
  // Policy internals — purple
  pipelineOperation: "purple",
  fsmTransition: "purple",
  validator: "purple",
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
  // Policy internals
  pipelineOperation: "Operation",
  fsmTransition: "Transition",
  validator: "Validator",
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
// Differentiated by role:
//   orchestrator: large (prominent singleton)
//   connector:    large (robust, important entry points)
//   endpoint:     medium
//   resource:     small (high-cardinality, minimal footprint)
//   mapper:       medium
//   policy:       medium
//   artifact:     small

export const NODE_DIMENSIONS: Record<
  DomainEntityType,
  { width: number; height: number }
> = {
  // Orchestrators — large, prominent
  edgeBroker: { width: 180, height: 64 },
  dataHub: { width: 180, height: 64 },
  pulse: { width: 160, height: 56 },
  // Connectors — large, robust
  adapter: { width: 170, height: 60 },
  bridge: { width: 170, height: 60 },
  listener: { width: 140, height: 48 },
  // Endpoints — medium
  otDevice: { width: 150, height: 52 },
  remoteBroker: { width: 160, height: 52 },
  // Resources — small (high-cardinality, minimal footprint)
  tag: { width: 100, height: 32 },
  domainTag: { width: 100, height: 32 },
  topic: { width: 120, height: 36 },
  topicFilter: { width: 120, height: 36 },
  // Mappers — medium
  northboundMapper: { width: 140, height: 44 },
  southboundMapper: { width: 140, height: 44 },
  assetMapper: { width: 140, height: 44 },
  combiner: { width: 130, height: 44 },
  bridgeSubscription: { width: 140, height: 44 },
  // Policies — medium
  dataPolicy: { width: 150, height: 48 },
  behaviorPolicy: { width: 150, height: 48 },
  // Artifacts — small
  schema: { width: 110, height: 36 },
  script: { width: 110, height: 36 },
  // Policy internals — small
  pipelineOperation: { width: 120, height: 36 },
  fsmTransition: { width: 130, height: 40 },
  validator: { width: 120, height: 36 },
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
  writes: {
    stroke: "var(--graph-edge-green-dash)",
    strokeWidth: 2,
    strokeDasharray: "6 3",
  },
  // BridgeSubscription → TopicFilter: Solid, orange
  filters: { stroke: "var(--graph-edge-orange)", strokeWidth: 1.5 },
  // BridgeSubscription → Topic: Solid, orange
  delivers: { stroke: "var(--graph-edge-orange)", strokeWidth: 1.5 },
  // Adapter/Bridge → Combiner: Solid, yellow
  sources: { stroke: "var(--graph-edge-yellow)", strokeWidth: 1.5 },
  // DataPolicy → TopicFilter: Dotted, purple
  attachedTo: {
    stroke: "var(--graph-edge-purple)",
    strokeWidth: 1.5,
    strokeDasharray: "2 3",
  },
  // DataPolicy → Schema: Dotted, purple
  validates: {
    stroke: "var(--graph-edge-purple)",
    strokeWidth: 1.5,
    strokeDasharray: "2 3",
  },
  // Policy → Script: Dashed, light purple
  executes: {
    stroke: "var(--graph-edge-purple-light)",
    strokeWidth: 1.5,
    strokeDasharray: "4 3",
  },
  // DataPolicy → Topic (redirect): Dashed, purple
  redirects: {
    stroke: "var(--graph-edge-purple)",
    strokeWidth: 1.5,
    strokeDasharray: "4 3",
  },
  // BehaviorPolicy → Schema: Dotted, light purple
  deserializes: {
    stroke: "var(--graph-edge-purple-light)",
    strokeWidth: 1.5,
    strokeDasharray: "2 3",
  },
  // TopicFilter → Topic: Dotted, light green
  matches: {
    stroke: "var(--graph-edge-green-light)",
    strokeWidth: 1.5,
    strokeDasharray: "2 3",
  },
  // Policy internals
  validatesWith: {
    stroke: "var(--graph-edge-purple-light)",
    strokeWidth: 1,
    strokeDasharray: "2 3",
  },
  transitionsVia: { stroke: "var(--graph-edge-purple)", strokeWidth: 1.5 },
  chains: { stroke: "var(--graph-edge-purple-light)", strokeWidth: 1 },
  invokes: {
    stroke: "var(--graph-edge-purple-light)",
    strokeWidth: 1.5,
    strokeDasharray: "4 3",
  },
  serializes: {
    stroke: "var(--graph-edge-purple-light)",
    strokeWidth: 1.5,
    strokeDasharray: "2 3",
  },
  redirectsTo: {
    stroke: "var(--graph-edge-purple)",
    strokeWidth: 1.5,
    strokeDasharray: "4 3",
  },
};

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  stroke: "var(--graph-edge-default)",
  strokeWidth: 1.5,
};

// --- Entity rank (layer ordering for directed layout) ---
// Lower rank = further upstream (leftward in LR mode).
// The data flow reads left-to-right:
//   Connectors → Endpoints → Tags → Mappers → Broker/Topics →
//   DataHub → Policies → [pipeline chain via layoutRank] → Resources
//
// Policy internals (pipelineOperation, fsmTransition, validator) use per-node
// layoutRank overrides for progressive chain positioning. Their static rank
// here is a fallback only.

export const ENTITY_RANK: Record<DomainEntityType, number> = {
  // Layer 0 — Connectors (entry points, leftmost in LR)
  adapter: 0, // OT connector
  bridge: 0, // IT connector
  listener: 0, // v1 infrastructure
  // Layer 1 — What connectors connect to
  otDevice: 1, // adapter → device
  remoteBroker: 1, // bridge → remote broker
  bridgeSubscription: 1,
  // Layer 2 — Data points
  domainTag: 2, // v1 tag
  tag: 2, // v2 tag (exposed by device)
  // Layer 3 — Transforms & aggregation
  northboundMapper: 3, // tag → topic
  southboundMapper: 3, // topicFilter → tag
  combiner: 3, // aggregates sources → topic
  assetMapper: 3,
  // Layer 4 — Central messaging
  edgeBroker: 4, // local MQTT broker
  topic: 4, // broker's topics
  topicFilter: 4, // broker's filters
  pulse: 4, // cloud platform
  // Layer 5 — Policy engine
  dataHub: 5,
  // Layer 6 — Policies
  dataPolicy: 6,
  behaviorPolicy: 6,
  // Layer 7+ — Policy internals (defaults; overridden per-node for chains)
  validator: 7,
  fsmTransition: 7,
  pipelineOperation: 8, // fallback; chains use layoutRank 7..N
  // Layer 10 — Resources (rightmost, past typical pipeline chains)
  schema: 10,
  script: 10,
};

// --- Layout defaults ---

export const DEFAULT_LAYOUT_DIRECTION = "LR" as const;
export const NODE_SPACING = 20;
export const RANK_SPACING = 60;
