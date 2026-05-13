import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task, workspace } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { activeTasks } from "@/lib/agent/active-tasks";
import { auth } from "@/lib/auth/auth-server";
import { headers } from "next/headers";

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

    const [existing] = await db
      .select()
      .from(task)
      .where(eq(task.id, id))
      .limit(1);

    if (!existing) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    // 验证 workspace 归属
    const [ws] = await db
      .select()
      .from(workspace)
      .where(and(eq(workspace.id, existing.workspaceId), eq(workspace.userId, session.user.id)))
      .limit(1);

    if (!ws) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    if (existing.status !== "running") {
      return Response.json({ error: "Task is not running" }, { status: 400 });
    }

    const activeTask = activeTasks.get(id);
    if (activeTask) {
      activeTask.abortController.abort();
      activeTasks.delete(id);
    }

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
