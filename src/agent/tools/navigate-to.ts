import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
import { getToolNavigate } from "@/agent/tool-context";

/**
 * Known routes in the application.
 * This list will grow as new pages are added.
 * The agent can also navigate to arbitrary paths for future routes.
 */
const KNOWN_ROUTES = ["/workspace", "/login"] as const;

const navigateToDef = toolDefinition({
  name: "navigateTo",
  description: `Navigate the user to a page in the HiveMQ Edge management UI. Known routes: ${KNOWN_ROUTES.join(", ")}. You may also navigate to sub-routes as they are added.`,
  inputSchema: z.object({
    path: z
      .string()
      .describe("The route path to navigate to, e.g. '/workspace'"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    path: z.string(),
    error: z.string().optional(),
  }),
});

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
