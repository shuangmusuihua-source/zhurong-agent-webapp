import { create } from "zustand";
import type { TaskStatus } from "@/lib/types";

export interface TaskInfo {
  taskId: string;
  buddyName?: string;
  buddyAvatar?: string;
  status: TaskStatus;
  toolStatus?: string;
  agentSessionId?: string;
}

export interface TaskItem {
  id: string;
  buddyName?: string;
  buddyAvatar?: string;
  status: string;
  createdAt: string;
}

interface TaskState {
  activeTask: TaskInfo | undefined;
  workspaceTasks: TaskItem[];
  selectedTaskId: string | undefined;
  setActiveTask: (task: TaskInfo | undefined) => void;
  updateActiveTask: (updater: (prev: TaskInfo | undefined) => TaskInfo | undefined) => void;
  setWorkspaceTasks: (tasks: TaskItem[]) => void;
  updateWorkspaceTasks: (updater: (prev: TaskItem[]) => TaskItem[]) => void;
  setSelectedTaskId: (id: string | undefined) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  activeTask: undefined,
  workspaceTasks: [],
  selectedTaskId: undefined,
  setActiveTask: (activeTask) => set({ activeTask }),
  updateActiveTask: (updater) => set((s) => ({ activeTask: updater(s.activeTask) })),
  setWorkspaceTasks: (workspaceTasks) => set({ workspaceTasks }),
  updateWorkspaceTasks: (updater) => set((s) => ({ workspaceTasks: updater(s.workspaceTasks) })),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
}));