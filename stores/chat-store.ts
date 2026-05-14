import { create } from "zustand";
import type { Message, Product } from "@/lib/types";

interface ChatState {
  messages: Message[];
  products: Product[];
  conversationId: string | undefined;
  isLoading: boolean;
  pendingQuestion: {
    questions: Array<{
      question: string;
      header: string;
      options?: Array<{ label: string; description?: string }>;
      multiSelect?: boolean;
      type?: "options" | "outline";
      items?: string[];
    }>;
  } | undefined;
  rightBarCollapsed: boolean;
  setMessages: (messages: Message[]) => void;
  updateMessages: (updater: (prev: Message[]) => Message[]) => void;
  setProducts: (products: Product[]) => void;
  updateProducts: (updater: (prev: Product[]) => Product[]) => void;
  setConversationId: (id: string | undefined) => void;
  setIsLoading: (loading: boolean) => void;
  setPendingQuestion: (question: ChatState["pendingQuestion"]) => void;
  updatePendingQuestion: (updater: (prev: ChatState["pendingQuestion"]) => ChatState["pendingQuestion"]) => void;
  toggleRightBar: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  products: [],
  conversationId: undefined,
  isLoading: false,
  pendingQuestion: undefined,
  rightBarCollapsed: true,
  setMessages: (messages) => set({ messages }),
  updateMessages: (updater) => set((s) => ({ messages: updater(s.messages) })),
  setProducts: (products) => set({ products }),
  updateProducts: (updater) => set((s) => ({ products: updater(s.products) })),
  setConversationId: (conversationId) => set({ conversationId }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setPendingQuestion: (pendingQuestion) => set({ pendingQuestion }),
  updatePendingQuestion: (updater) => set((s) => ({ pendingQuestion: updater(s.pendingQuestion) })),
  toggleRightBar: () => set((s) => ({ rightBarCollapsed: !s.rightBarCollapsed })),
}));