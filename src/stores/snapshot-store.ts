import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SnapshotDisplayType = "table" | "json" | "graph";

export type QuerySnapshot = {
  id: string;
  toolName: string;
  operation: string;
  displayType: SnapshotDisplayType;
  timestamp: number;
  data: unknown;
  label: string;
  graphScope?: string;
  graphFocusEntityId?: string;
};

const MAX_SNAPSHOTS = 50;

interface SnapshotState {
  snapshots: QuerySnapshot[];
  addSnapshot: (partial: Omit<QuerySnapshot, "id" | "timestamp">) => string;
  removeSnapshot: (id: string) => void;
  getSnapshot: (id: string) => QuerySnapshot | undefined;
  clearAll: () => void;
}

export const useSnapshotStore = create<SnapshotState>()(
  persist(
    (set, get) => ({
      snapshots: [],

      addSnapshot: (partial) => {
        const id = crypto.randomUUID();
        const snapshot: QuerySnapshot = {
          ...partial,
          id,
          timestamp: Date.now(),
        };
        set((state) => ({
          snapshots: [snapshot, ...state.snapshots].slice(0, MAX_SNAPSHOTS),
        }));
        return id;
      },

      removeSnapshot: (id) => {
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.id !== id),
        }));
      },

      getSnapshot: (id) => {
        return get().snapshots.find((s) => s.id === id);
      },

      clearAll: () => {
        set({ snapshots: [] });
      },
    }),
    {
      name: "query-snapshots",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
