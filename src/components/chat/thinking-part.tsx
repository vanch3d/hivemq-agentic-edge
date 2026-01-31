import { useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuChevronRight, LuChevronDown } from "react-icons/lu";

export function ThinkingPart({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Box fontSize="xs" color="fg.muted">
      <Text
        as="span"
        cursor="pointer"
        display="inline-flex"
        alignItems="center"
        gap="1"
        onClick={() => setIsOpen((prev) => !prev)}
        _hover={{ color: "fg.default" }}
      >
        {isOpen ? <LuChevronDown /> : <LuChevronRight />}
        {t("chat.thinking")}
      </Text>
      {isOpen && (
        <Box
          mt="1"
          pl="4"
          borderLeftWidth="2px"
          borderColor="border.muted"
          whiteSpace="pre-wrap"
        >
          {content}
        </Box>
      )}
    </Box>
  );
}
