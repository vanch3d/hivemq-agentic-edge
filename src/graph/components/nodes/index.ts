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

/** Custom node types for React Flow — must be defined at module scope */
export const nodeTypes: NodeTypes = {
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
};
