import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

interface ApprovalCardProps {
  title: string;
  description: string;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalCard({
  title,
  description,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const { t } = useTranslation();

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      p="2"
      bg="bg.subtle"
      borderColor="border.warning"
      w="full"
      fontSize="sm"
    >
      <Heading size="xs" mb="1">
        {title}
      </Heading>
      <Text fontSize="xs" color="fg.muted" mb="2">
        {description}
      </Text>
      <Flex gap="2">
        <Button size="xs" colorPalette="blue" onClick={onApprove}>
          {t("chat.approve")}
        </Button>
        <Button size="xs" variant="ghost" onClick={onReject}>
          {t("chat.reject")}
        </Button>
      </Flex>
    </Box>
  );
}
