import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Box, Button, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@uidotdev/usehooks";
import { useSettings } from "@/hooks/use-settings";
import { SchemaForm } from "@/components/schema-form";
import { toaster } from "@/components/ui/toaster";
import { useChatContext } from "@/context/chat-context";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute(
  "/_authenticated/workspace/configuration/settings",
)({
  component: SettingsPage,
});

function getProvider(data: Record<string, unknown>): unknown {
  const ai = data.ai as Record<string, unknown> | undefined;
  return ai?.provider;
}

function SettingsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useSettings();
  const [formData, setFormData] = useLocalStorage<Record<string, unknown>>(
    "app-settings",
    {},
  );
  const chatContext = useChatContext();
  const [pendingFormData, setPendingFormData] = useState<Record<
    string,
    unknown
  > | null>(null);

  if (isLoading || !data) return <Spinner size="sm" />;

  // Merge: localStorage overrides on top of server defaults
  const mergedFormData = { ...data.formData, ...formData };

  const handleChange = (newData: Record<string, unknown>) => {
    const currentProvider = getProvider(mergedFormData);
    const newProvider = getProvider(newData);

    if (newProvider !== currentProvider) {
      // Provider changed — ask for confirmation before applying
      setPendingFormData(newData);
    } else {
      // Normal change — save immediately
      setFormData(newData);
      toaster.create({
        id: "settings-saved",
        title: t("settings.saved"),
        type: "success",
      });
    }
  };

  const confirmProviderChange = () => {
    if (pendingFormData) {
      setFormData(pendingFormData);
      chatContext.clear();
      toaster.create({
        id: "settings-saved",
        title: t("settings.saved"),
        type: "success",
      });
    }
    setPendingFormData(null);
  };

  const cancelProviderChange = () => {
    setPendingFormData(null);
  };

  return (
    <Box>
      <Stack gap="1" mb="6">
        <Heading size="xl">{t("settings.title")}</Heading>
        <Text color="fg.muted">{t("settings.subtitle")}</Text>
      </Stack>

      <SchemaForm
        schema={data.schema}
        uiSchema={data.uiSchema}
        formData={mergedFormData}
        onSubmit={() => {}}
        onChange={(newData) => handleChange(newData as Record<string, unknown>)}
      >
        <Button
          type="button"
          variant="outline"
          mt="4"
          onClick={() => {
            setFormData({});
            toaster.create({
              id: "settings-saved",
              title: t("settings.saved"),
              type: "success",
            });
          }}
        >
          {t("settings.resetDefaults")}
        </Button>
      </SchemaForm>

      <DialogRoot
        open={pendingFormData !== null}
        onOpenChange={({ open }) => {
          if (!open) cancelProviderChange();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.providerChangeTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>
              {t("settings.providerChangeDescription")}
            </DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={cancelProviderChange}>
              {t("settings.providerChangeCancel")}
            </Button>
            <Button colorPalette="red" onClick={confirmProviderChange}>
              {t("settings.providerChangeConfirm")}
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
