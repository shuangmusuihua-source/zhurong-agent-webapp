import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";

export interface AgentOptions {
  prompt: string;
  sessionId?: string;
  skills?: string[] | "all";
  allowedTools?: string[];
  cwd?: string;
  model?: string;
}

export interface AgentEvent {
  type: "message" | "complete" | "error";
  data: SDKMessage | AgentCompleteData | AgentErrorData;
}

export interface AgentCompleteData {
  sessionId: string;
  result: string;
  cost: number | undefined;
  turns: number;
}

export interface AgentErrorData {
  message: string;
}

export async function* streamAgentResponse(
  options: AgentOptions
): AsyncGenerator<AgentEvent> {
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
      },
    })) {
      yield { type: "message", data: message };

      if (message.type === "result") {
        const resultMsg = message as SDKResultMessage;
        yield {
          type: "complete",
          data: {
            sessionId: resultMsg.session_id,
            result: "result" in resultMsg ? resultMsg.result || "" : "",
            cost: resultMsg.total_cost_usd,
            turns: resultMsg.num_turns,
          },
        };
      }
    }
  } catch (error) {
    yield {
      type: "error",
      data: {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

export async function getAvailableSkills(_cwd: string): Promise<string[]> {
  // Skills are discovered from .claude/skills/ directory
  // This is a placeholder - in production, you'd scan the skills directory
  return ["example-skill"];
}
