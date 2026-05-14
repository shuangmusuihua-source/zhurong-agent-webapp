import { create } from "zustand";
import type { DigitalBuddy } from "@/lib/types";

interface HomeState {
  buddies: DigitalBuddy[];
  loaded: boolean;
  setBuddies: (buddies: DigitalBuddy[]) => void;
  setLoaded: (loaded: boolean) => void;
  invalidate: () => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  buddies: [],
  loaded: false,
  setBuddies: (buddies) => set({ buddies }),
  setLoaded: (loaded) => set({ loaded }),
  invalidate: () => set({ loaded: false }),
}));