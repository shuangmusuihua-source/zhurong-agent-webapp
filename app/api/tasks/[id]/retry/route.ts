import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task, workspace } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

    if (existing.status === "running") {
      return Response.json({ error: "Task is already running" }, { status: 400 });
    }

    // 重试时设为 pending（不是 running），等前端发 chat 请求时再设为 running
    await db
      .update(task)
      .set({ status: "pending", updatedAt: new Date() })
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
