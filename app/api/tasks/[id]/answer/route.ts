import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task, message, workspace } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/auth-server";
import { headers } from "next/headers";
import { activeTasks } from "@/lib/agent/active-tasks";
import { nanoid } from "nanoid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { answers, conversationId } = body;

    if (!answers || typeof answers !== "object") {
      return Response.json({ error: "answers object is required" }, { status: 400 });
    }

    // 验证 task 归属
    const [existing] = await db.select().from(task).where(eq(task.id, id)).limit(1);
    if (!existing) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const [ws] = await db
      .select()
      .from(workspace)
      .where(and(eq(workspace.id, existing.workspaceId), eq(workspace.userId, session.user.id)))
      .limit(1);
    if (!ws) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    // 从 activeTasks 取出 pendingQuestionResolve
    const activeTask = activeTasks.get(id);
    if (!activeTask?.pendingQuestionResolve) {
      return Response.json({ error: "No pending question for this task" }, { status: 400 });
    }

    // resolve canUseTool 的 Promise，让 Agent 继续执行
    // updatedInput 保留原始 questions，加上用户 answers（SDK 要求格式）
    const resolve = activeTask.pendingQuestionResolve;
    const originalInput = activeTask.pendingQuestionInput ?? {};
    activeTask.pendingQuestionResolve = undefined;
    activeTask.pendingQuestionInput = undefined;

    resolve({
      behavior: "allow",
      updatedInput: {
        ...originalInput,
        answers,
      },
    });

    console.log(`[Answer] Task ${id} received answers:`, JSON.stringify(answers), `agent resumed`);

    // 更新 DB task 状态回 running
    await db.update(task).set({ status: "running", updatedAt: new Date() }).where(eq(task.id, id));

    // 保存用户消息到 DB
    if (conversationId) {
      const answerText = Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join("\n");
      await db.insert(message).values({
        id: nanoid(),
        conversationId,
        role: "user",
        content: answerText,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Answer task error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}