import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth-server";
import { streamAgentResponse, StreamEvent } from "@/lib/agent/client";
import { AbortError } from "@anthropic-ai/claude-agent-sdk";
import { activeTasks } from "@/lib/agent/active-tasks";
import { db } from "@/lib/db";
import { conversation, message, workspace, task, digitalBuddy, product } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prompt, conversationId: existingConversationId, workspaceId, agentSessionId: resumeSessionId } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Workspace is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userWorkspace = await db
      .select()
      .from(workspace)
      .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, session.user.id)))
      .limit(1);

    if (!userWorkspace[0]) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 查找当前工作区的 running task
    const runningTasks = await db
      .select({
        task: task,
        buddy: digitalBuddy,
      })
      .from(task)
      .leftJoin(digitalBuddy, eq(task.buddyId, digitalBuddy.id))
      .where(and(eq(task.workspaceId, workspaceId), inArray(task.status, ["running", "pending"])))
      .limit(1);

    const currentTask = runningTasks[0];
    const skillId = currentTask?.buddy?.skillId;

    let currentConversationId = existingConversationId;
    let agentSessionId: string | undefined = resumeSessionId;

    if (currentConversationId) {
      const existingConversation = await db
        .select()
        .from(conversation)
        .where(eq(conversation.id, currentConversationId))
        .limit(1);

      if (existingConversation[0]) {
        agentSessionId = existingConversation[0].agentSessionId ?? undefined;
      } else {
        currentConversationId = undefined;
      }
    }

    if (!currentConversationId) {
      currentConversationId = nanoid();
      await db.insert(conversation).values({
        id: currentConversationId,
        workspaceId: workspaceId,
        title: prompt.slice(0, 100),
        activeBuddyId: currentTask?.task?.buddyId ?? null,
      });
    }

    // 更新 task 的 conversationId
    if (currentTask && !currentTask.task.conversationId) {
      await db
        .update(task)
        .set({ conversationId: currentConversationId })
        .where(eq(task.id, currentTask.task.id));
    }

    await db.insert(message).values({
      id: nanoid(),
      conversationId: currentConversationId,
      role: "user",
      content: prompt,
    });

    const encoder = new TextEncoder();
    let assistantContent = "";
    let controllerClosed = false;
    const createdProductPaths = new Set<string>();

    // 注册活跃任务
    const abortController = new AbortController();
    if (currentTask) {
      // pending → running
      if (currentTask.task.status === "pending") {
        await db
          .update(task)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(task.id, currentTask.task.id));
        currentTask.task.status = "running";
      }
      activeTasks.set(currentTask.task.id, {
        abortController,
        agentSessionId: currentTask.task.agentSessionId ?? undefined,
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送 task_started 事件
          if (currentTask) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "task_started",
                  taskId: currentTask.task.id,
                  buddyName: currentTask.buddy?.name,
                  buddyAvatar: currentTask.buddy?.avatar,
                  skillId,
                  agentSessionId: currentTask.task.agentSessionId,
                })}\n\n`
              )
            );
          }

          for await (const event of streamAgentResponse({
            prompt,
            sessionId: agentSessionId,
            skills: skillId ? [skillId] : undefined,
            abortController,
          })) {
            if (event.type === "text_delta") {
              assistantContent += event.text;
            }

            // 识别 Write/Edit 工具调用完成，创建产物记录
            if (event.type === "tool_use_complete" && (event.toolName === "Write" || event.toolName === "Edit") && event.toolInput) {
              const filePath = (event.toolInput.file_path ?? event.toolInput.path) as string;
              console.log(`[Product] ${event.toolName} complete, filePath:`, filePath);
              if (filePath && currentTask && !createdProductPaths.has(filePath)) {
                createdProductPaths.add(filePath);
                const fileName = filePath.split("/").pop() ?? filePath;
                const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
                const productType = ext === "html" || ext === "htm" ? "slides"
                  : ext === "pptx" || ext === "ppt" ? "slides"
                  : ext === "md" || ext === "docx" || ext === "pdf" ? "document"
                  : ext === "py" || ext === "js" || ext === "ts" || ext === "tsx" ? "code"
                  : ext === "png" || ext === "jpg" || ext === "svg" ? "image"
                  : "document";

                const productId = nanoid();
                await db.insert(product).values({
                  id: productId,
                  workspaceId: workspaceId,
                  taskId: currentTask.task.id,
                  conversationId: currentConversationId!,
                  type: productType,
                  name: fileName,
                  content: filePath,
                  status: "generating",
                });

                if (!controllerClosed) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "product_created",
                        productId,
                        name: fileName,
                        productType,
                        taskId: currentTask.task.id,
                        status: "generating",
                      })}\n\n`
                    )
                  );
                }
              }
            }

            // 识别 AskUserQuestion 工具调用，发送问题到前端
            if (event.type === "tool_use_complete" && event.toolName === "AskUserQuestion" && event.toolInput) {
              if (!controllerClosed) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "ask_user",
                      questions: event.toolInput.questions,
                      title: event.toolInput.title,
                    })}\n\n`
                  )
                );
              }
            }

            // complete 事件最后处理，关闭流
            if (event.type === "complete") {
              await db
                .update(conversation)
                .set({
                  agentSessionId: event.agentSessionId,
                  updatedAt: new Date(),
                })
                .where(eq(conversation.id, currentConversationId!));

              if (assistantContent) {
                await db.insert(message).values({
                  id: nanoid(),
                  conversationId: currentConversationId!,
                  role: "assistant",
                  content: assistantContent,
                });
              }

              // 更新 task 状态为 completed
              if (currentTask) {
                await db
                  .update(task)
                  .set({ status: "completed", agentSessionId: event.agentSessionId, updatedAt: new Date() })
                  .where(eq(task.id, currentTask.task.id));

                // 更新该任务所有产物为 completed
                await db
                  .update(product)
                  .set({ status: "completed" })
                  .where(eq(product.taskId, currentTask.task.id));

                activeTasks.delete(currentTask.task.id);

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "task_completed",
                      taskId: currentTask.task.id,
                    })}\n\n`
                  )
                );
              }

              const completeEvent: StreamEvent & { conversationId: string } = {
                ...event,
                conversationId: currentConversationId!,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`));

              controller.close();
              controllerClosed = true;
              return;
            }

            // 其他事件正常转发
            if (!controllerClosed) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
          }
        } catch (error) {
          // 中止是用户主动停止，stop route 已处理状态更新
          if (error instanceof AbortError) {
            if (!controllerClosed) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "task_failed",
                    taskId: currentTask?.task.id,
                  })}\n\n`
                )
              );
            }
          } else {
            console.error("Stream error:", error);

            if (currentTask) {
              await db
                .update(task)
                .set({ status: "failed", updatedAt: new Date() })
                .where(eq(task.id, currentTask.task.id));

              activeTasks.delete(currentTask.task.id);

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "task_failed",
                    taskId: currentTask.task.id,
                    message: error instanceof Error ? error.message : "Stream error",
                  })}\n\n`
                )
              );
            }

            if (!controllerClosed) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    message: error instanceof Error ? error.message : "Stream error",
                  })}\n\n`
                )
              );
            }
          }
        } finally {
          if (!controllerClosed) {
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const userWorkspaces = await db
      .select()
      .from(workspace)
      .where(eq(workspace.userId, session.user.id));

    if (userWorkspaces.length === 0) {
      return new Response(JSON.stringify({ conversations: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const workspaceIds = userWorkspaces.map((w) => w.id);

    let conversations;
    if (workspaceId) {
      conversations = await db
        .select()
        .from(conversation)
        .where(eq(conversation.workspaceId, workspaceId))
        .orderBy(desc(conversation.updatedAt))
        .limit(20);
    } else {
      conversations = await db
        .select()
        .from(conversation)
        .where(inArray(conversation.workspaceId, workspaceIds))
        .orderBy(desc(conversation.updatedAt))
        .limit(20);
    }

    return new Response(JSON.stringify({ conversations }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}