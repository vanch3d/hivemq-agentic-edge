import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Grid, Text } from "@chakra-ui/react";
import { ResponsiveLine } from "@nivo/line";
import { useTranslation } from "react-i18next";
import { getSample } from "@/api/sdk.gen";
import { useNivoTheme } from "@/hooks/use-nivo-theme";
import { useColorMode } from "@/components/ui/color-mode";
import { useQuery } from "@tanstack/react-query";
import { parseMetricName } from "@/utils/parse-metric-name";

const MAX_DATA_POINTS = 150;

interface ChartPoint {
  x: string;
  y: number;
}

interface MetricSparklineProps {
  metricName: string;
  pollInterval: number;
}

function MetricSparkline({ metricName, pollInterval }: MetricSparklineProps) {
  const { t } = useTranslation();
  const nivoTheme = useNivoTheme();
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  const bufferRef = useRef<ChartPoint[]>([]);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [currentValue, setCurrentValue] = useState<number | null>(null);

  const queryFn = useCallback(async () => {
    const { data, error } = await getSample({
      path: { metricName },
    });
    if (error) throw error;
    return data;
  }, [metricName]);

  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["metric-sample", metricName],
    queryFn,
    refetchInterval: pollInterval,
  });

  // Accumulate data points in an effect (not during render)
  useEffect(() => {
    if (!data?.sampleTime || data.value == null) return;

    const point: ChartPoint = { x: data.sampleTime, y: data.value };
    bufferRef.current = [...bufferRef.current, point].slice(-MAX_DATA_POINTS);

    setPoints([...bufferRef.current]);
    setCurrentValue(data.value);
  }, [dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- trigger on fetch, not data ref

  const parsed = parseMetricName(metricName);

  const chartData = [
    {
      id: metricName,
      data:
        points.length > 0 ? points : [{ x: new Date().toISOString(), y: 0 }],
    },
  ];

  return (
    <Box
      borderWidth="1px"
      borderColor={isDark ? "gray.700" : "gray.200"}
      borderRadius="md"
      p="2"
      bg={isDark ? "gray.800/50" : "gray.50/50"}
    >
      <Text fontSize="xs" color="fg.muted" truncate title={metricName}>
        {parsed.label}
      </Text>

      <Text fontSize="xl" fontWeight="bold" fontFamily="mono" py="1">
        {currentValue != null
          ? formatValue(currentValue)
          : t("metrics.live.noData")}
      </Text>

      <Box h="80px">
        {points.length >= 2 ? (
          <ResponsiveLine
            data={chartData}
            theme={nivoTheme}
            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            xScale={{ type: "point" }}
            yScale={{
              type: "linear",
              min: "auto",
              max: "auto",
            }}
            curve="monotoneX"
            enableArea
            areaOpacity={isDark ? 0.15 : 0.1}
            colors={[isDark ? "#60a5fa" : "#3b82f6"]}
            lineWidth={1.5}
            enablePoints={false}
            enableGridX={false}
            enableGridY={false}
            axisTop={null}
            axisRight={null}
            axisBottom={null}
            axisLeft={null}
            isInteractive={false}
            animate={false}
          />
        ) : (
          <Box
            h="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="xs" color="fg.muted">
              {t("metrics.live.noData")}
            </Text>
          </Box>
        )}
      </Box>

      <Text fontSize="2xs" color="fg.muted" mt="1">
        {t("metrics.live.dataPoints", { count: points.length })}
      </Text>
    </Box>
  );
}

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}G`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export interface ChatMetricLiveProps {
  metricNames: string[];
  pollInterval: number;
}

export function ChatMetricLive({
  metricNames,
  pollInterval,
}: ChatMetricLiveProps) {
  const { t } = useTranslation();
  const columns = metricNames.length === 1 ? 1 : 2;

  return (
    <Box maxW="full" py="1">
      <Grid templateColumns={`repeat(${columns}, 1fr)`} gap="2">
        {metricNames.map((name) => (
          <MetricSparkline
            key={name}
            metricName={name}
            pollInterval={pollInterval}
          />
        ))}
      </Grid>
      <Text fontSize="2xs" color="fg.muted" mt="1" textAlign="right">
        {t("metrics.live.polling", { interval: pollInterval / 1000 })}
      </Text>
    </Box>
  );
}
