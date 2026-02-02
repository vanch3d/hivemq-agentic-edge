import { navigateToDef } from "@/agent/tool-definitions";
import { getToolNavigate } from "@/agent/tool-context";

export const navigateTo = navigateToDef.client(async (input) => {
  const navigate = getToolNavigate();
  if (!navigate) {
    return {
      success: false,
      path: input.path,
      error: "Navigation is not available",
    };
  }

  try {
    navigate(input.path);
    return { success: true, path: input.path };
  } catch (e) {
    return { success: false, path: input.path, error: String(e) };
  }
});
