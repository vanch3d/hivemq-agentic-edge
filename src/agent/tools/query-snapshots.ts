import { querySnapshotsDef } from "@/agent/tool-definitions";
import { useSnapshotStore } from "@/stores/snapshot-store";
import { getToolNavigate } from "@/agent/tool-context";

function toSummary(s: {
  id: string;
  toolName: string;
  operation: string;
  label: string;
  displayType: string;
  timestamp: number;
}) {
  return {
    id: s.id,
    toolName: s.toolName,
    operation: s.operation,
    label: s.label,
    displayType: s.displayType,
    timestamp: s.timestamp,
  };
}

export const querySnapshots = querySnapshotsDef.client(async (input) => {
  const store = useSnapshotStore.getState();
  const limit = input.limit ?? 10;

  switch (input.operation) {
    case "list": {
      const snapshots = store.snapshots.slice(0, limit).map(toSummary);
      return { snapshots };
    }

    case "search": {
      let filtered = store.snapshots;

      if (input.toolName) {
        const tn = input.toolName.toLowerCase();
        filtered = filtered.filter((s) => s.toolName.toLowerCase() === tn);
      }

      if (input.query) {
        const q = input.query.toLowerCase();
        filtered = filtered.filter((s) => s.label.toLowerCase().includes(q));
      }

      const snapshots = filtered.slice(0, limit).map(toSummary);
      return { snapshots };
    }

    case "open": {
      if (!input.ids || input.ids.length === 0) {
        return { snapshots: [], error: "ids are required for 'open'" };
      }

      const navigate = getToolNavigate();
      const opened: string[] = [];

      for (const id of input.ids) {
        const snap = store.getSnapshot(id);
        if (snap && navigate) {
          navigate(`/workspace/snapshot/${id}`);
          opened.push(id);
        }
      }

      // Navigate to the last one (the one the user will see)
      const found = input.ids
        .map((id) => store.getSnapshot(id))
        .filter(Boolean)
        .map((s) => toSummary(s!));

      return { snapshots: found, opened };
    }
  }
});
