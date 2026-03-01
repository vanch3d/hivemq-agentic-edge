import { Box, Badge, HStack, Text, Icon, VStack } from "@chakra-ui/react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { GraphNodeData, DomainEntityType } from "@/graph/types";
import { ENTITY_COLORS, ENTITY_ICONS } from "@/graph/constants";

const ROLE_COLORS: Record<string, string> = {
  orchestrator: "cyan.600",
  connector: "blue.500",
  integrationPoint: "green.500",
  mapper: "yellow.600",
  policy: "purple.500",
  resource: "purple.300",
};

const ROLE_LABELS: Record<string, string> = {
  orchestrator: "Orchestrator",
  connector: "Connector",
  integrationPoint: "Integration Point",
  mapper: "Mapper",
  policy: "Policy",
  resource: "Resource",
};

/**
 * Schema class node — renders an entity class from the ontology definition.
 * Visually distinct from instance nodes: wider, double border, shows role
 * and property/relationship counts.
 */
export function SchemaClassNode({
  data,
  selected,
}: NodeProps & { data: GraphNodeData }) {
  const entityType = data.entityType as DomainEntityType;
  const color = ENTITY_COLORS[entityType] ?? "gray.500";
  const EntityIcon = ENTITY_ICONS[entityType];
  const role = (data.raw?.role as string) ?? "";
  const properties = (data.raw?.properties as unknown[]) ?? [];
  const relationships = (data.raw?.relationships as unknown[]) ?? [];
  const derivedFrom = data.raw?.derivedFrom as object | undefined;
  const apiType = data.raw?.apiType as string | undefined;

  return (
    <Box
      borderWidth="3px"
      borderColor={selected ? "blue.500" : color}
      borderStyle="double"
      borderRadius="lg"
      bg="bg.panel"
      px="3"
      py="2"
      minW="160px"
      maxW="240px"
      position="relative"
      boxShadow={selected ? "0 0 0 2px var(--chakra-colors-blue-300)" : "sm"}
      _hover={{ boxShadow: "md" }}
      transition="box-shadow 0.15s"
    >
      {/* Role badge */}
      <Badge
        size="xs"
        bg={ROLE_COLORS[role] ?? "gray.500"}
        color="white"
        mb="1"
        fontSize="2xs"
      >
        {ROLE_LABELS[role] ?? role}
      </Badge>

      {/* Entity label */}
      <HStack gap="1" mb="0.5">
        {EntityIcon && (
          <Icon asChild boxSize="3.5" color={color}>
            <EntityIcon />
          </Icon>
        )}
        <Text fontSize="sm" fontWeight="bold">
          {data.label}
        </Text>
      </HStack>

      {/* Source badge */}
      <Text fontSize="2xs" color="fg.muted" mb="1">
        {apiType ? `API: ${apiType}` : derivedFrom ? "Derived" : "Singleton"}
      </Text>

      {/* Stats */}
      <VStack gap="0" align="start">
        {properties.length > 0 && (
          <Text fontSize="2xs" color="fg.muted">
            {properties.length} {properties.length === 1 ? "property" : "properties"}
          </Text>
        )}
        {relationships.length > 0 && (
          <Text fontSize="2xs" color="fg.muted">
            {relationships.length} {relationships.length === 1 ? "relationship" : "relationships"}
          </Text>
        )}
      </VStack>

      {/* Handles — source + target on all four sides for floating edges */}
      <Handle type="source" position={Position.Top} />
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Bottom} />
      <Handle type="source" position={Position.Left} />
      <Handle type="target" position={Position.Left} />
    </Box>
  );
}
