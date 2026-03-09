import { memo } from "react";
import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

/** Built-in functions that are NOT user scripts */
const BUILT_IN_FUNCTIONS = new Set([
  "System.log",
  "Metrics.Counter.increment",
  "Mqtt.UserProperties.add",
  "Serdes.deserialize",
  "Serdes.serialize",
  "Delivery.redirectTo",
  "Mqtt.drop",
  "Mqtt.disconnect",
]);

export const PipelineOperationNode = memo(function PipelineOperationNode(
  props: NodeProps & { data: GraphNodeData },
) {
  const raw = props.data.raw;
  const functionId = raw?.functionId as string | undefined;
  const isBuiltIn = functionId ? BUILT_IN_FUNCTIONS.has(functionId) : false;

  return (
    <BaseNode {...props}>
      {functionId && (
        <Text
          fontSize="2xs"
          color="fg.muted"
          truncate
          fontFamily={isBuiltIn ? undefined : "mono"}
        >
          {functionId}
        </Text>
      )}
    </BaseNode>
  );
});
