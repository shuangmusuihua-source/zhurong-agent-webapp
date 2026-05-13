import type { Query } from "@anthropic-ai/claude-agent-sdk";

// 回调类型：resolve canUseTool 的 Promise，让 Agent 继续执行
export type QuestionResolve = (result: {
  behavior: "allow";
  updatedInput?: Record<string, unknown>;
}) => void;

// 内存中维护活跃任务的引用，用于停止/重试/追问
export interface ActiveTask {
  query?: Query;
  abortController: AbortController;
  agentSessionId?: string;
  // 当 Agent 调用 AskUserQuestion 时，canUseTool 回调返回一个 pending Promise
  // resolve 被存在这里，用户回答后调用 resolve 让 Agent 继续
  pendingQuestionResolve?: QuestionResolve;
  // AskUserQuestion 的原始输入（包含 questions），用于构建 updatedInput
  pendingQuestionInput?: Record<string, unknown>;
}

// taskId → ActiveTask
export const activeTasks = new Map<string, ActiveTask>();
