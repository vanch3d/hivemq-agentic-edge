import { Box, Button, HStack } from "@chakra-ui/react";
import {
  LuMaximize,
  LuArrowRightFromLine,
  LuArrowDownFromLine,
  LuNetwork,
  LuDatabase,
} from "react-icons/lu";
import { useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";

import { useGraphStore } from "@/graph/store";
import type { ViewScope } from "@/graph/types";
import { VIEW_SCOPES } from "@/graph/types";

const SCOPE_LABELS: Record<ViewScope, string> = {
  full: "Full",
  dataFlow: "Data Flow",
  adapterTopology: "Adapters",
  policyImpact: "Policies",
  bridgeTopology: "Bridges",
  combinerSources: "Combiners",
};

export function GraphControls() {
  const { t } = useTranslation();
  const layoutDirection = useGraphStore((s) => s.layoutDirection);
  const setLayoutDirection = useGraphStore((s) => s.setLayoutDirection);
  const viewScope = useGraphStore((s) => s.viewScope);
  const setViewScope = useGraphStore((s) => s.setViewScope);
  const viewMode = useGraphStore((s) => s.viewMode);
  const setViewMode = useGraphStore((s) => s.setViewMode);
  const rf = useReactFlow();

  const isSchema = viewMode === "schema";

  return (
    <Box
      p="2"
      borderTopWidth="1px"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      flexWrap="wrap"
      gap="2"
    >
      {/* Left: View mode toggle + scope selector */}
      <HStack gap="2" flexWrap="wrap">
        {/* View mode toggle */}
        <HStack gap="1">
          <Button
            size="xs"
            variant={isSchema ? "outline" : "solid"}
            onClick={() => setViewMode("instance")}
            title={t("graph.instanceView")}
          >
            <LuDatabase />
            {t("graph.instance")}
          </Button>
          <Button
            size="xs"
            variant={isSchema ? "solid" : "outline"}
            onClick={() => setViewMode("schema")}
            title={t("graph.schemaView")}
          >
            <LuNetwork />
            {t("graph.schema")}
          </Button>
        </HStack>

        {/* Scope selector (only in instance mode) */}
        {!isSchema && (
          <HStack gap="1" flexWrap="wrap">
            {VIEW_SCOPES.map((scope) => (
              <Button
                key={scope}
                size="xs"
                variant={viewScope === scope ? "solid" : "outline"}
                onClick={() => setViewScope(scope)}
              >
                {SCOPE_LABELS[scope]}
              </Button>
            ))}
          </HStack>
        )}
      </HStack>

      {/* Right: Layout controls */}
      <HStack gap="1">
        <Button
          size="xs"
          variant="ghost"
          onClick={() =>
            setLayoutDirection(layoutDirection === "LR" ? "TB" : "LR")
          }
          title={
            layoutDirection === "LR"
              ? "Switch to top-down layout"
              : "Switch to left-right layout"
          }
        >
          {layoutDirection === "LR" ? (
            <LuArrowDownFromLine />
          ) : (
            <LuArrowRightFromLine />
          )}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => rf.fitView({ padding: 0.2 })}
          title="Fit view"
        >
          <LuMaximize />
        </Button>
      </HStack>
    </Box>
  );
}
