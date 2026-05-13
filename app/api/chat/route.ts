import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task, digitalBuddy, conversation, message, product, workspace } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/lib/auth/auth-server";
import { nanoid } from "nanoid";
import { createAgentSession, iterateAgentSession } from "@/lib/agent/client";
import { activeTasks } from "@/lib/agent/active-tasks";
import { EventBroadcaster, type BufferedEvent } from "@/lib/agent/event-broadcaster";
import { TOOL_LABELS } from "@/lib/types";

export const maxDuration = 300;

// GET: 获取对话列表
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return Response.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await db
      .select()
      .from(conversation)
      .where(eq(conversation.workspaceId, workspaceId))
      .orderBy(desc(conversation.createdAt));

    return Response.json({ conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// POST: 发送消息并启动 agent
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, conversationId: existingConversationId, workspaceId, agentSessionId: resumeSessionId, buddyId, taskId: clientTaskId } = body;

  if (!workspaceId || !prompt) {
    return Response.json({ error: "workspaceId and prompt are required" }, { status: 400 });
  }

  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 验证 workspace 归属
    const [ws] = await db
      .select()
      .from(workspace)
      .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, session.user.id)))
      .limit(1);

    if (!ws) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    // 查找 running/pending task
    const runningTasks = await db
      .select({ task, buddy: digitalBuddy })
      .from(task)
      .leftJoin(digitalBuddy, eq(task.buddyId, digitalBuddy.id))
      .where(eq(task.workspaceId, workspaceId));

    let currentTask = runningTasks.find((t) => t.task.status === "running" || t.task.status === "pending");

    // 如果没有 running/pending task 但有 buddyId，自动创建 task
    if (!currentTask && buddyId) {
      const [buddy] = await db.select().from(digitalBuddy).where(eq(digitalBuddy.id, buddyId)).limit(1);
      if (buddy) {
        const newTaskId = nanoid();
        await db.insert(task).values({
          id: newTaskId,
          workspaceId,
          buddyId,
          status: "pending",
        });
        const [newTask] = await db.select().from(task).where(eq(task.id, newTaskId)).limit(1);
        currentTask = { task: newTask, buddy };
      }
    }

    // 如果客户端传了 taskId，优先使用
    if (!currentTask && clientTaskId) {
      const [found] = await db.select({ task, buddy: digitalBuddy })
        .from(task)
        .leftJoin(digitalBuddy, eq(task.buddyId, digitalBuddy.id))
        .where(eq(task.id, clientTaskId))
        .limit(1);
      if (found) currentTask = found;
    }

    const skillId = currentTask?.buddy?.skillId;

    // 创建或复用 conversation
    let convId = existingConversationId;
    if (!convId) {
      const convIdNew = nanoid();
      await db.insert(conversation).values({
        id: convIdNew,
        workspaceId,
        activeBuddyId: currentTask?.buddy?.id ?? null,
      });
      convId = convIdNew;
    }

    // 保存用户消息
    await db.insert(message).values({
      id: nanoid(),
      conversationId: convId,
      role: "user",
      content: prompt,
    });

    // 更新 task 状态为 running
    if (currentTask && currentTask.task.status === "pending") {
      await db.update(task).set({ status: "running", conversationId: convId, updatedAt: new Date() }).where(eq(task.id, currentTask.task.id));
    }

    // 创建新的 AgentSession（canUseTool 机制处理 AskUserQuestion 暂停）
    const { queryResult, abortController } = createAgentSession({
      prompt,
      sessionId: resumeSessionId,
      skills: skillId ? [skillId] : "all",
      abortController: new AbortController(),
      taskId: currentTask?.task.id,
    });

    // 注册到 activeTasks（含 EventBroadcaster 支持 SSE 重连）
    if (currentTask) {
      activeTasks.set(currentTask.task.id, {
        query: queryResult,
        abortController,
        broadcaster: new EventBroadcaster(),
      });
    }

    return streamResponse(queryResult, currentTask?.task.id, convId!, workspaceId, skillId);
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

function streamResponse(
  queryResult: ReturnType<typeof createAgentSession>["queryResult"],
  taskId: string | undefined,
  conversationId: string,
  workspaceId: string,
  skillId: string | undefined,
) {
  const encoder = new TextEncoder();
  let controllerClosed = false;
  const broadcaster = taskId ? activeTasks.get(taskId)?.broadcaster : undefined;

  const send = (data: Record<string, unknown>) => {
    if (controllerClosed) return;
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {}
  };

  const sendAndBroadcast = (data: BufferedEvent) => {
    send(data);
    broadcaster?.broadcast(data);
  };

  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream({
    async start(ctrl) {
      controller = ctrl;

      // 心跳
      const heartbeat = setInterval(() => {
        send({ type: "ping" });
      }, 30000);

      try {
        // 发送 task_started
        if (taskId) {
          sendAndBroadcast({ type: "task_started", taskId });
        }

        let fullText = "";

        for await (const event of iterateAgentSession(queryResult)) {
          // 客户端断开后不中断循环，继续迭代和广播
          // Agent 在 canUseTool 暂停时 for-await 自然阻塞，无 CPU 开销

          switch (event.type) {
            case "text_delta":
              fullText += event.text;
              // 更新 accumulatedText，供重连时获取完整文本
              if (taskId) {
                const at = activeTasks.get(taskId);
                if (at) at.accumulatedText = fullText;
              }
              sendAndBroadcast({ type: "text_delta", text: event.text });
              break;

            case "tool_use": {
              const toolLabel = TOOL_LABELS[event.toolName] ?? event.toolName;
              sendAndBroadcast({ type: "tool_use", toolName: event.toolName, toolLabel });
              break;
            }

            case "tool_use_complete": {
              // 检测 AskUserQuestion — canUseTool 已暂停 Agent，这里只发 SSE 通知前端
              if (event.toolName === "AskUserQuestion" || event.toolName === "mcp__AskUserQuestion") {
                const questions = event.toolInput?.questions ?? event.toolInput;
                sendAndBroadcast({ type: "ask_user", questions, toolUseId: event.toolUseId });
              }

              // 检测 Write/Edit 创建产物
              if (
                event.toolName === "Write" ||
                event.toolName === "mcp__Write" ||
                event.toolName === "Edit" ||
                event.toolName === "mcp__Edit"
              ) {
                const filePath = (event.toolInput?.file_path ?? event.toolInput?.path ?? "") as string;
                if (filePath) {
                  const fileName = filePath.split("/").pop() ?? filePath;
                  const productId = nanoid();
                  try {
                    await db.insert(product).values({
                      id: productId,
                      workspaceId,
                      taskId: taskId ?? null,
                      conversationId,
                      type: "slides",
                      name: fileName,
                      content: filePath,
                      status: "completed",
                    });
                    sendAndBroadcast({ type: "product_created", productId, name: fileName, productType: "slides" });
                  } catch (e) {
                    console.error("Failed to create product:", e);
                  }
                }
              }
              break;
            }

            case "complete": {
              // 保存 agent 回复
              if (fullText) {
                await db.insert(message).values({
                  id: nanoid(),
                  conversationId,
                  role: "assistant",
                  content: fullText,
                });
              }

              // 正常完成
              if (taskId) {
                await db.update(task).set({
                  status: "completed",
                  agentSessionId: event.agentSessionId,
                  updatedAt: new Date(),
                }).where(eq(task.id, taskId));
                activeTasks.delete(taskId);
              }

              await db.update(conversation).set({
                agentSessionId: event.agentSessionId,
                updatedAt: new Date(),
              }).where(eq(conversation.id, conversationId));

              sendAndBroadcast({ type: "task_completed", agentSessionId: event.agentSessionId });
              sendAndBroadcast({ type: "complete" });
              broadcaster?.markComplete();
              break;
            }

            case "error":
              sendAndBroadcast({ type: "error", message: event.message });
              if (taskId) {
                await db.update(task).set({ status: "failed", updatedAt: new Date() }).where(eq(task.id, taskId));
                activeTasks.delete(taskId);
              }
              broadcaster?.markComplete();
              break;
          }
        }
      } catch (error) {
        if (!controllerClosed) {
          sendAndBroadcast({ type: "error", message: error instanceof Error ? error.message : "Stream error" });
          if (taskId) {
            await db.update(task).set({ status: "failed", updatedAt: new Date() }).where(eq(task.id, taskId));
            activeTasks.delete(taskId);
          }
        }
        broadcaster?.markComplete();
      } finally {
        clearInterval(heartbeat);
        if (!controllerClosed) {
          controllerClosed = true;
          try { controller.close(); } catch {}
        }
      }
    },
    cancel() {
      // 客户端断开时只标记 controllerClosed，不中断 for-await 循环
      // Agent 继续运行，事件继续广播到 broadcaster，供 /stream 重连使用
      controllerClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}