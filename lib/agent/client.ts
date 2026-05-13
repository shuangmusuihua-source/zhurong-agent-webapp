import { query, AbortError } from "@anthropic-ai/claude-agent-sdk";
import type {
  SDKMessage,
  SDKResultMessage,
  SDKPartialAssistantMessage
} from "@anthropic-ai/claude-agent-sdk";
import { createWebSearchMcpServer } from "./tools/web-search";
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
}

export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "tool_use"; toolName: string; toolInput?: Record<string, unknown> }
  | { type: "tool_use_complete"; toolName: string; toolInput: Record<string, unknown> }
  | { type: "message"; data: SDKMessage }
  | { type: "complete"; agentSessionId: string }
  | { type: "error"; message: string };

export async function* streamAgentResponse(
  options: AgentOptions
): AsyncGenerator<StreamEvent> {
  try {
    const webSearchServer = createWebSearchMcpServer();

    // 追踪当前 content block 的累积状态
    let currentToolName = "";
    let currentToolInputJson = "";

    for await (const message of query({
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
        abortController: options.abortController,
      },
    })) {
      if (message.type === "stream_event") {
        const partialMsg = message as SDKPartialAssistantMessage;
        const event = partialMsg.event;

        if (event.type === "content_block_start") {
          const block = event.content_block as any;
          if (block.type === "tool_use" || block.type === "mcp_tool_use") {
            currentToolName = block.name;
            currentToolInputJson = "";
            console.log(`[Agent] 工具调用开始: ${block.name}`);
            yield { type: "tool_use", toolName: block.name, toolInput: block.input };
          }
        } else if (event.type === "content_block_delta") {
          const delta = event.delta;

          if (delta.type === "text_delta") {
            yield { type: "text_delta", text: delta.text };
          } else if (delta.type === "thinking_delta") {
            yield { type: "thinking_delta", thinking: delta.thinking };
          } else if (delta.type === "input_json_delta") {
            // 累积工具输入 JSON
            currentToolInputJson += delta.partial_json;
          }
        } else if (event.type === "content_block_stop") {
          // 工具输入完成，发出完整事件
          if (currentToolName && currentToolInputJson) {
            try {
              const fullInput = JSON.parse(currentToolInputJson);
              console.log(`[Agent] 工具调用完成: ${currentToolName}`, fullInput);
              yield { type: "tool_use_complete", toolName: currentToolName, toolInput: fullInput };
            } catch {
              console.log(`[Agent] 工具输入解析失败: ${currentToolName}`);
            }
          }
          currentToolName = "";
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

export async function getAvailableSkills(_cwd: string): Promise<string[]> {
  return ["example-skill"];
}