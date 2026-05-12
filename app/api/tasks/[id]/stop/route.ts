import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { activeTasks } from "@/lib/agent/active-tasks";

export async function POST(
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

    if (existing.status !== "running") {
      return Response.json({ error: "Task is not running" }, { status: 400 });
    }

    // 中止活跃的 Agent 查询
    const activeTask = activeTasks.get(id);
    if (activeTask) {
      activeTask.abortController.abort();
      activeTasks.delete(id);
    }

    // 更新任务状态为 failed
    await db
      .update(task)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(task.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Stop task error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
