import { useMemo } from "react";
import { useColorMode } from "@/components/ui/color-mode";
import type { PartialTheme } from "@nivo/theming";

/**
 * Bridge hook that produces a Nivo theme aligned with Chakra UI color mode.
 * Uses Chakra CSS variables where SVG supports them, resolved values otherwise.
 */
export function useNivoTheme(): PartialTheme {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  return useMemo(
    (): PartialTheme => ({
      background: "transparent",
      text: {
        fontSize: 11,
        fill: isDark ? "#a3a3a3" : "#737373",
        fontFamily:
          "var(--chakra-fonts-body, ui-sans-serif, system-ui, sans-serif)",
      },
      axis: {
        domain: {
          line: { stroke: isDark ? "#525252" : "#d4d4d4", strokeWidth: 1 },
        },
        ticks: {
          line: { stroke: isDark ? "#525252" : "#d4d4d4", strokeWidth: 1 },
          text: {
            fontSize: 10,
            fill: isDark ? "#a3a3a3" : "#737373",
          },
        },
        legend: {
          text: {
            fontSize: 11,
            fill: isDark ? "#d4d4d4" : "#525252",
          },
        },
      },
      grid: {
        line: { stroke: isDark ? "#2d2d2d" : "#ededed", strokeWidth: 1 },
      },
      tooltip: {
        container: {
          background: isDark ? "#1a1a2e" : "#ffffff",
          color: isDark ? "#e5e5e5" : "#333333",
          fontSize: 12,
          borderRadius: "6px",
          boxShadow: isDark
            ? "0 2px 8px rgba(0,0,0,0.4)"
            : "0 2px 8px rgba(0,0,0,0.12)",
        },
      },
      crosshair: {
        line: {
          stroke: isDark ? "#a3a3a3" : "#666666",
          strokeWidth: 1,
          strokeOpacity: 0.5,
        },
      },
    }),
    [isDark],
  );
}
