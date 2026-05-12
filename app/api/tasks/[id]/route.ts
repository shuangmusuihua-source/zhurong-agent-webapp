import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// 更新任务状态
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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

// 删除任务
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [existing] = await db
      .select()
      .from(task)
      .where(eq(task.id, id))
      .limit(1);

    if (!existing) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    if (existing.status === "running") {
      return Response.json(
        { error: "无法删除执行中的任务，请先停止" },
        { status: 409 }
      );
    }

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
