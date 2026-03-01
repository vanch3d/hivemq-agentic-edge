import { useEffect, useRef } from "react";
import { useGraphStore } from "@/graph/store";
import { GraphPage } from "@/graph/components/graph-page";
import type { ViewScope } from "@/graph/types";

interface SnapshotGraphProps {
  scope: string;
  focusEntityId?: string;
}

export function SnapshotGraph({ scope, focusEntityId }: SnapshotGraphProps) {
  const prevScope = useRef<{ scope: ViewScope; focusId: string | null } | null>(
    null,
  );

  useEffect(() => {
    const store = useGraphStore.getState();
    prevScope.current = {
      scope: store.viewScope,
      focusId: store.focusEntityId,
    };

    store.setViewScope(scope as ViewScope, focusEntityId ?? null);

    return () => {
      if (prevScope.current) {
        useGraphStore
          .getState()
          .setViewScope(prevScope.current.scope, prevScope.current.focusId);
      }
    };
  }, [scope, focusEntityId]);

  return <GraphPage />;
}
