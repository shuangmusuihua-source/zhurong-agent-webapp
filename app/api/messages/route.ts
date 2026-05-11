import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth-server";
import { db } from "@/lib/db";
import { message, conversation, workspace } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "conversationId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 验证用户有权访问该对话
    const conversationResult = await db
      .select()
      .from(conversation)
      .where(eq(conversation.id, conversationId))
      .limit(1);

    if (!conversationResult[0]) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 验证工作区属于用户
    const workspaceResult = await db
      .select()
      .from(workspace)
      .where(
        and(
          eq(workspace.id, conversationResult[0].workspaceId),
          eq(workspace.userId, session.user.id)
        )
      )
      .limit(1);

    if (!workspaceResult[0]) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 获取消息列表
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.conversationId, conversationId))
      .orderBy(message.createdAt);

    return new Response(JSON.stringify({ messages }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
