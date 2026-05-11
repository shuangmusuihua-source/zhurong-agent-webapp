import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth-server";
import { streamAgentResponse, StreamEvent } from "@/lib/agent/client";
import { db } from "@/lib/db";
import { conversation, message, workspace } from "@/lib/db/schema";
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
    const { prompt, conversationId: existingConversationId, skills, workspaceId } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Workspace is required. Please create a workspace first." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user has access to the workspace
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

    let currentConversationId = existingConversationId;
    let agentSessionId: string | undefined;

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
      });
    }

    await db.insert(message).values({
      id: nanoid(),
      conversationId: currentConversationId,
      role: "user",
      content: prompt,
    });

    const encoder = new TextEncoder();
    let assistantContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamAgentResponse({
            prompt,
            sessionId: agentSessionId,
            skills,
          })) {
            // 累积文本用于存储
            if (event.type === "text_delta") {
              assistantContent += event.text;
            }

            // 为 complete 事件添加 conversationId
            if (event.type === "complete") {
              const completeEvent: StreamEvent & { conversationId: string } = {
                ...event,
                conversationId: currentConversationId!,
              };

              // 更新数据库
              await db
                .update(conversation)
                .set({
                  agentSessionId: event.agentSessionId,
                  updatedAt: new Date(),
                })
                .where(eq(conversation.id, currentConversationId!));

              // 保存助手消息
              if (assistantContent) {
                await db.insert(message).values({
                  id: nanoid(),
                  conversationId: currentConversationId!,
                  role: "assistant",
                  content: assistantContent,
                });
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`));
              return;
            }

            // 发送事件
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: error instanceof Error ? error.message : "Stream error",
              })}\n\n`
            )
          );
        } finally {
          controller.close();
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

    // Get user's workspaces
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

    // Query conversations
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
