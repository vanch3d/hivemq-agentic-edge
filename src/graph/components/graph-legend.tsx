import { Box, HStack, Text, Icon } from "@chakra-ui/react";

import type { DomainEntityType } from "@/graph/types";
import { ENTITY_COLORS, ENTITY_ICONS, ENTITY_LABELS } from "@/graph/constants";
import { useGraphStore } from "@/graph/store";

export function GraphLegend() {
  const fullNodes = useGraphStore((s) => s.fullNodes);
  const hiddenEntityTypes = useGraphStore((s) => s.hiddenEntityTypes);
  const toggleEntityType = useGraphStore((s) => s.toggleEntityType);

  // Only show entity types that have at least one node in the graph
  const presentTypes = Array.from(
    new Set(fullNodes.map((n) => n.data.entityType)),
  );

  return (
    <Box p="2" borderTopWidth="1px">
      <HStack gap="1.5" flexWrap="wrap">
        {presentTypes.map((type: DomainEntityType) => {
          const EntityIcon = ENTITY_ICONS[type];
          const isHidden = hiddenEntityTypes.has(type);
          return (
            <HStack
              key={type}
              as="button"
              gap="1"
              px="1.5"
              py="0.5"
              borderRadius="sm"
              cursor="pointer"
              opacity={isHidden ? 0.4 : 1}
              bg={isHidden ? "transparent" : "bg.subtle"}
              _hover={{ bg: "bg.muted" }}
              transition="opacity 0.15s, background 0.15s"
              onClick={() => toggleEntityType(type)}
            >
              <Icon asChild boxSize="3" color={ENTITY_COLORS[type]}>
                <EntityIcon />
              </Icon>
              <Text
                fontSize="2xs"
                color="fg.muted"
                textDecoration={isHidden ? "line-through" : "none"}
                userSelect="none"
              >
                {ENTITY_LABELS[type]}
              </Text>
            </HStack>
          );
        })}
      </HStack>
    </Box>
  );
}
