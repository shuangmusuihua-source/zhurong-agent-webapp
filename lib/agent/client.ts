import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  SDKMessage,
  SDKResultMessage,
  SDKPartialAssistantMessage
} from "@anthropic-ai/claude-agent-sdk";

export interface AgentOptions {
  prompt: string;
  sessionId?: string;
  skills?: string[] | "all";
  allowedTools?: string[];
  cwd?: string;
  model?: string;
}

// 细粒度流式事件类型
export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "message"; data: SDKMessage }
  | { type: "complete"; agentSessionId: string }
  | { type: "error"; message: string };

export async function* streamAgentResponse(
  options: AgentOptions
): AsyncGenerator<StreamEvent> {
  try {
    for await (const message of query({
      prompt: options.prompt,
      options: {
        resume: options.sessionId,
        skills: options.skills ?? "all",
        allowedTools: options.allowedTools ?? [
          "Read",
          "Bash",
          "Glob",
          "Grep",
          "Edit",
          "Write",
        ],
        settingSources: ["user", "project"],
        maxTurns: 20,
        cwd: options.cwd ?? process.cwd(),
        model: options.model ?? process.env.ANTHROPIC_MODEL ?? "astron-code-latest",
        includePartialMessages: true,
      },
    })) {
      // 处理流式事件
      if (message.type === "stream_event") {
        const partialMsg = message as SDKPartialAssistantMessage;
        const event = partialMsg.event;

        if (event.type === "content_block_delta") {
          const delta = event.delta;

          if (delta.type === "text_delta") {
            yield { type: "text_delta", text: delta.text };
          } else if (delta.type === "thinking_delta") {
            yield { type: "thinking_delta", thinking: delta.thinking };
          }
        }
        continue;
      }

      // 处理完成
      if (message.type === "result") {
        const resultMsg = message as SDKResultMessage;
        yield {
          type: "complete",
          agentSessionId: resultMsg.session_id,
        };
      }
    }
  } catch (error) {
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getAvailableSkills(_cwd: string): Promise<string[]> {
  return ["example-skill"];
}
