import { Flex, Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export function BridgeNode(props: NodeProps & { data: GraphNodeData }) {
  const { t } = useTranslation();
  const raw = props.data.raw;
  const localCount = (raw?.localSubscriptions as unknown[])?.length ?? 0;
  const remoteCount = (raw?.remoteSubscriptions as unknown[])?.length ?? 0;
  return (
    <BaseNode {...props}>
      <Flex gap="2" fontSize="2xs" color="fg.muted">
        <Text>{t("graph.localSubs", { count: localCount })}</Text>
        <Text>{t("graph.remoteSubs", { count: remoteCount })}</Text>
      </Flex>
    </BaseNode>
  );
}
