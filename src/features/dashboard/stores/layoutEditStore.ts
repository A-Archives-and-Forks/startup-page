import { create } from "zustand";

interface LayoutEditStore {
  editing: boolean;
  setEditing: (editing: boolean) => void;
  toggleEditing: () => void;
}

// Tracks whether the dashboard grid is in "edit layout" mode. Kept in its own
// lightweight store so the toggle button (in the top-right chrome) and the grid
// (in the dashboard page) can share the flag without prop drilling.
export const useLayoutEditStore = create<LayoutEditStore>((set) => ({
  editing: false,
  setEditing: (editing) => set({ editing }),
  toggleEditing: () => set((state) => ({ editing: !state.editing })),
}));
