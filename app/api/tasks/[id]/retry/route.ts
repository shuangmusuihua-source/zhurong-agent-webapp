import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    if (existing.status === "running") {
      return Response.json({ error: "Task is already running" }, { status: 400 });
    }

    // 重置任务状态为 running，保留 agentSessionId 用于 resume
    await db
      .update(task)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(task.id, id));

    const [updated] = await db
      .select()
      .from(task)
      .where(eq(task.id, id))
      .limit(1);

    return Response.json({ task: updated });
  } catch (error) {
    console.error("Retry task error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
