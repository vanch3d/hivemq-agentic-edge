import { Box, Code } from "@chakra-ui/react";
import { Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

interface SnapshotJsonProps {
  data: unknown;
}

export function SnapshotJson({ data }: SnapshotJsonProps) {
  const { t } = useTranslation();

  if (data === null || data === undefined) {
    return (
      <Text fontSize="sm" color="fg.muted">
        {t("snapshot.noData")}
      </Text>
    );
  }

  return (
    <Box overflowX="auto">
      <Code
        display="block"
        whiteSpace="pre-wrap"
        p="4"
        fontSize="sm"
        borderRadius="md"
      >
        {JSON.stringify(data, null, 2)}
      </Code>
    </Box>
  );
}
