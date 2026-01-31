import { Component, type ReactNode } from "react";
import { Box, Text } from "@chakra-ui/react";
import i18n from "@/i18n";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Box p="4" color="fg.error">
          <Text fontWeight="semibold">{i18n.t("chat.errorTitle")}</Text>
          <Text fontSize="sm">{this.state.error.message}</Text>
        </Box>
      );
    }
    return this.props.children;
  }
}
