import type { NodeTypes } from "@xyflow/react";
import { AdapterNode } from "./adapter-node";
import { BridgeNode } from "./bridge-node";
import { DomainTagNode } from "./domain-tag-node";
import { TopicFilterNode } from "./topic-filter-node";
import { DataPolicyNode } from "./data-policy-node";
import { BehaviorPolicyNode } from "./behavior-policy-node";
import { SchemaNode } from "./schema-node";
import { ScriptNode } from "./script-node";
import { CombinerNode } from "./combiner-node";
import { ListenerNode } from "./listener-node";
// v2 node types
import { EdgeBrokerNode } from "./edge-broker-node";
import { DataHubNode } from "./data-hub-node";
import { PulseNode } from "./pulse-node";
import { RemoteBrokerNode } from "./remote-broker-node";
import { OtDeviceNode } from "./ot-device-node";
import { TagNode } from "./tag-node";
import { TopicNode } from "./topic-node";
import { MapperNode } from "./mapper-node";
import { BridgeSubscriptionNode } from "./bridge-subscription-node";
import { SchemaClassNode } from "./schema-class-node";

/** Custom node types for React Flow — must be defined at module scope */
export const nodeTypes: NodeTypes = {
  // v1
  adapter: AdapterNode,
  bridge: BridgeNode,
  domainTag: DomainTagNode,
  topicFilter: TopicFilterNode,
  dataPolicy: DataPolicyNode,
  behaviorPolicy: BehaviorPolicyNode,
  schema: SchemaNode,
  script: ScriptNode,
  combiner: CombinerNode,
  listener: ListenerNode,
  // v2
  edgeBroker: EdgeBrokerNode,
  dataHub: DataHubNode,
  pulse: PulseNode,
  remoteBroker: RemoteBrokerNode,
  otDevice: OtDeviceNode,
  tag: TagNode,
  topic: TopicNode,
  northboundMapper: MapperNode,
  southboundMapper: MapperNode,
  assetMapper: MapperNode,
  bridgeSubscription: BridgeSubscriptionNode,
  // Schema/class view
  schemaClass: SchemaClassNode,
};
