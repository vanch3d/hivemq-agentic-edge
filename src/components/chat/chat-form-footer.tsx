import { Button, Flex, Text } from "@chakra-ui/react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type FormCore from "@rjsf/core";

interface ChatFormFooterProps {
  formRef: RefObject<FormCore | null>;
  requiredOnly: boolean;
  showAll: boolean;
  onCancel: () => void;
  onToggleShowAll: () => void;
}

export function ChatFormFooter({
  formRef,
  requiredOnly,
  showAll,
  onCancel,
  onToggleShowAll,
}: ChatFormFooterProps) {
  const { t } = useTranslation();

  return (
    <Flex gap="2" p="3" borderTopWidth="1px" alignItems="center">
      <Button
        size="xs"
        colorPalette="blue"
        onClick={() => formRef.current?.submit()}
      >
        {t("chat.formSubmit")}
      </Button>
      <Button size="xs" variant="ghost" onClick={onCancel}>
        {t("chat.formCancel")}
      </Button>
      {requiredOnly && !showAll && (
        <Text
          as="button"
          fontSize="xs"
          color="fg.muted"
          cursor="pointer"
          onClick={onToggleShowAll}
          ml="auto"
        >
          {t("chat.formShowAll")}
        </Text>
      )}
    </Flex>
  );
}
