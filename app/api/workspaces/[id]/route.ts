import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth-server";
import { db } from "@/lib/db";
import { workspace, task, product, conversation, message, contextFile } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// 删除工作区（级联删除产物）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [ws] = await db
      .select()
      .from(workspace)
      .where(and(eq(workspace.id, id), eq(workspace.userId, session.user.id)))
      .limit(1);

    if (!ws) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    // 检查是否有执行中的任务
    const runningTasks = await db
      .select()
      .from(task)
      .where(eq(task.workspaceId, id));

    const hasRunning = runningTasks.some((t) => t.status === "running");
    if (hasRunning) {
      return Response.json(
        {
          error: "该工作区有任务正在执行中，请先停止任务再删除",
          hasRunningTask: true,
        },
        { status: 409 }
      );
    }

    // 级联删除：message → product → task → contextFile → conversation → workspace
    // product 引用 task，所以 product 必须在 task 之前删除
    const conversations = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(eq(conversation.workspaceId, id));
    for (const conv of conversations) {
      await db.delete(message).where(eq(message.conversationId, conv.id));
    }
    await db.delete(product).where(eq(product.workspaceId, id));
    await db.delete(task).where(eq(task.workspaceId, id));
    await db.delete(contextFile).where(eq(contextFile.workspaceId, id));
    await db.delete(conversation).where(eq(conversation.workspaceId, id));
    await db.delete(workspace).where(eq(workspace.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete workspace error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
