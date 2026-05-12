// 内存中维护活跃任务的引用，用于停止/重试
export interface ActiveTask {
  abortController: AbortController;
  agentSessionId?: string;
}

// taskId → ActiveTask
export const activeTasks = new Map<string, ActiveTask>();
