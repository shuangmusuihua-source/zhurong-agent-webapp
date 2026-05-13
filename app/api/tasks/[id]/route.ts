import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task, workspace, product } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/auth-server";
import { headers } from "next/headers";

async function verifyTaskOwnership(taskId: string, userId: string) {
  const [t] = await db
    .select()
    .from(task)
    .where(eq(task.id, taskId))
    .limit(1);

  if (!t) return null;

  const [ws] = await db
    .select()
    .from(workspace)
    .where(and(eq(workspace.id, t.workspaceId), eq(workspace.userId, userId)))
    .limit(1);

  return ws ? t : null;
}

// 更新任务状态
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const t = await verifyTaskOwnership(id, session.user.id);
    if (!t) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, agentSessionId } = body;

    const validStatuses = ["running", "completed", "failed"];
    if (status && !validStatuses.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (agentSessionId !== undefined) updates.agentSessionId = agentSessionId;

    await db.update(task).set(updates).where(eq(task.id, id));

    const [updated] = await db
      .select()
      .from(task)
      .where(eq(task.id, id))
      .limit(1);

    if (!updated) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    return Response.json({ task: updated });
  } catch (error) {
    console.error("Update task error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// 删除任务（级联删除关联 products）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const t = await verifyTaskOwnership(id, session.user.id);
    if (!t) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    if (t.status === "running") {
      return Response.json(
        { error: "无法删除执行中的任务，请先停止" },
        { status: 409 }
      );
    }

    // 级联删除关联的 products
    await db.delete(product).where(eq(product.taskId, id));
    await db.delete(task).where(eq(task.id, id));
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
