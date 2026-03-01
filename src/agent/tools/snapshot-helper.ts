import { createToolSnapshot, type SnapshotRequest } from "@/agent/tool-context";

export function snapshotQueryResult(opts: {
  toolName: string;
  operation: string;
  data: unknown;
  label: string;
  graphScope?: string;
  graphFocusEntityId?: string;
}): string | null {
  let displayType: SnapshotRequest["displayType"];

  if (opts.graphScope) {
    displayType = "graph";
  } else if (Array.isArray(opts.data)) {
    displayType = "table";
  } else {
    displayType = "json";
  }

  return createToolSnapshot({
    toolName: opts.toolName,
    operation: opts.operation,
    displayType,
    data: opts.data,
    label: opts.label,
    graphScope: opts.graphScope,
    graphFocusEntityId: opts.graphFocusEntityId,
  });
}
