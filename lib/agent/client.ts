import { query, AbortError } from "@anthropic-ai/claude-agent-sdk";
import type {
  Query,
  SDKMessage,
  SDKResultMessage,
  SDKPartialAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { createWebSearchMcpServer } from "./tools/web-search";
import type { ActiveTask } from "./active-tasks";
import { activeTasks } from "./active-tasks";
import { mkdirSync } from "fs";
import { join } from "path";

const WORKSPACE_OUTPUTS_DIR = join(process.cwd(), "workspace-outputs");
mkdirSync(WORKSPACE_OUTPUTS_DIR, { recursive: true });

export interface AgentOptions {
  prompt: string;
  sessionId?: string;
  skills?: string[] | "all";
  allowedTools?: string[];
  cwd?: string;
  model?: string;
  abortController?: AbortController;
  taskId?: string;
}

export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "tool_use"; toolName: string; toolInput?: Record<string, unknown>; toolUseId?: string }
  | { type: "tool_use_complete"; toolName: string; toolUseId?: string; toolInput: Record<string, unknown> }
  | { type: "message"; data: SDKMessage }
  | { type: "complete"; agentSessionId: string }
  | { type: "error"; message: string };

export function createAgentSession(options: AgentOptions): { queryResult: Query; abortController: AbortController } {
  const abortController = options.abortController ?? new AbortController();
  const webSearchServer = createWebSearchMcpServer();

  const queryResult = query({
    prompt: options.prompt,
    options: {
      resume: options.sessionId,
      skills: options.skills ?? "all",
      allowedTools: options.allowedTools ?? [
        "Read",
        "Glob",
        "Grep",
        "Edit",
        "Write",
        "AskUserQuestion",
        "mcp__web-search__WebSearch",
      ],
      mcpServers: {
        "web-search": webSearchServer,
      },
      settingSources: ["user", "project"],
      maxTurns: 20,
      cwd: options.cwd ?? process.cwd(),
      model: options.model ?? process.env.ANTHROPIC_MODEL ?? "astron-code-latest",
      includePartialMessages: true,
      abortController,
      // canUseTool: 当 Agent 调用 AskUserQuestion 时，真正暂停等待用户回答
      canUseTool: async (toolName, input, opts) => {
        if (toolName !== "AskUserQuestion" && toolName !== "mcp__AskUserQuestion") {
          return { behavior: "allow" as const, updatedInput: input as Record<string, unknown> };
        }

        const taskId = options.taskId;
        if (!taskId) {
          return { behavior: "allow" as const, updatedInput: input as Record<string, unknown> };
        }

        console.log(`[canUseTool] AskUserQuestion for task ${taskId}, pausing agent...`);

        return new Promise((resolve) => {
          const activeTask = activeTasks.get(taskId);
          if (activeTask) {
            activeTask.pendingQuestionResolve = resolve;
            activeTask.pendingQuestionInput = input as Record<string, unknown>;
          } else {
            resolve({ behavior: "allow" as const, updatedInput: input as Record<string, unknown> });
          }
        });
      },
    },
  });

  return { queryResult, abortController };
}

export async function* iterateAgentSession(queryResult: Query): AsyncGenerator<StreamEvent> {
  try {
    let currentToolName = "";
    let currentToolUseId = "";
    let currentToolInputJson = "";

    for await (const message of queryResult) {
      if (message.type === "stream_event") {
        const partialMsg = message as SDKPartialAssistantMessage;
        const event = partialMsg.event;

        if (event.type === "content_block_start") {
          const block = event.content_block as any;
          if (block.type === "tool_use" || block.type === "mcp_tool_use") {
            currentToolName = block.name;
            currentToolUseId = block.id;
            currentToolInputJson = "";
            console.log(`[Agent] 工具调用开始: ${block.name}`);
            yield { type: "tool_use", toolName: block.name, toolInput: block.input, toolUseId: block.id };
          }
        } else if (event.type === "content_block_delta") {
          const delta = event.delta;

          if (delta.type === "text_delta") {
            yield { type: "text_delta", text: delta.text };
          } else if (delta.type === "thinking_delta") {
            yield { type: "thinking_delta", thinking: delta.thinking };
          } else if (delta.type === "input_json_delta") {
            currentToolInputJson += delta.partial_json;
          }
        } else if (event.type === "content_block_stop") {
          if (currentToolName && currentToolInputJson) {
            try {
              const fullInput = JSON.parse(currentToolInputJson);
              console.log(`[Agent] 工具调用完成: ${currentToolName}`, fullInput);
              yield { type: "tool_use_complete", toolName: currentToolName, toolUseId: currentToolUseId, toolInput: fullInput };
            } catch {
              console.log(`[Agent] 工具输入解析失败: ${currentToolName}`);
            }
          }
          currentToolName = "";
          currentToolUseId = "";
          currentToolInputJson = "";
        }
        continue;
      }

      if (message.type === "result") {
        const resultMsg = message as SDKResultMessage;
        yield {
          type: "complete",
          agentSessionId: resultMsg.session_id,
        };
      }
    }
  } catch (error) {
    if (error instanceof AbortError) return;
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// 保留旧接口向后兼容
export async function* streamAgentResponse(
  options: AgentOptions
): AsyncGenerator<StreamEvent> {
  const { queryResult } = createAgentSession(options);
  yield* iterateAgentSession(queryResult);
}

export async function getAvailableSkills(_cwd: string): Promise<string[]> {
  return ["example-skill"];
}
