import { create } from "zustand";
import type { DigitalBuddy, Task } from "@/lib/types";

interface HomeState {
  buddies: DigitalBuddy[];
  recentTasks: Task[];
  loaded: boolean;
  setBuddies: (buddies: DigitalBuddy[]) => void;
  setRecentTasks: (tasks: Task[]) => void;
  setLoaded: (loaded: boolean) => void;
  invalidate: () => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  buddies: [],
  recentTasks: [],
  loaded: false,
  setBuddies: (buddies) => set({ buddies }),
  setRecentTasks: (recentTasks) => set({ recentTasks }),
  setLoaded: (loaded) => set({ loaded }),
  invalidate: () => set({ loaded: false }),
}));