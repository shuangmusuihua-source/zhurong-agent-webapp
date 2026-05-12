import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task, digitalBuddy, workspace } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth/auth-server";
import { nanoid } from "nanoid";

// 获取任务列表
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const recent = req.nextUrl.searchParams.get("recent");

  // 获取用户最近任务（不限工作区）
  if (recent) {
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session?.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userWorkspaces = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.userId, session.user.id));

      if (userWorkspaces.length === 0) {
        return Response.json({ tasks: [] });
      }

      const wsIds = userWorkspaces.map((w) => w.id);

      const tasks = await db
        .select({
          id: task.id,
          workspaceId: task.workspaceId,
          buddyId: task.buddyId,
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          buddyName: digitalBuddy.name,
          buddyAvatar: digitalBuddy.avatar,
        })
        .from(task)
        .leftJoin(digitalBuddy, eq(task.buddyId, digitalBuddy.id))
        .where(inArray(task.workspaceId, wsIds))
        .orderBy(desc(task.createdAt))
        .limit(10);

      return Response.json({ tasks });
    } catch (error) {
      console.error("Get recent tasks error:", error);
      return Response.json({ error: "Server error" }, { status: 500 });
    }
  }

  if (!workspaceId) {
    return Response.json({ error: "workspaceId is required" }, { status: 400 });
  }

  try {
    const tasks = await db
      .select({
        id: task.id,
        workspaceId: task.workspaceId,
        buddyId: task.buddyId,
        conversationId: task.conversationId,
        status: task.status,
        agentSessionId: task.agentSessionId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        buddyName: digitalBuddy.name,
        buddyAvatar: digitalBuddy.avatar,
      })
      .from(task)
      .leftJoin(digitalBuddy, eq(task.buddyId, digitalBuddy.id))
      .where(eq(task.workspaceId, workspaceId))
      .orderBy(desc(task.createdAt));

    return Response.json({ tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// 创建任务
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId, buddyId, conversationId } = body;

    if (!workspaceId || !buddyId) {
      return Response.json(
        { error: "workspaceId and buddyId are required" },
        { status: 400 }
      );
    }

    // 检查是否有执行中的任务
    const runningTasks = await db
      .select()
      .from(task)
      .where(eq(task.workspaceId, workspaceId))
      .limit(1);

    const hasRunning = runningTasks.some((t) => t.status === "running");
    if (hasRunning) {
      return Response.json(
        { error: "该工作区已有任务执行中，请等待完成后再创建新任务" },
        { status: 409 }
      );
    }

    const id = nanoid();
    await db.insert(task).values({
      id,
      workspaceId,
      buddyId,
      conversationId: conversationId || null,
      status: "pending",
    });

    const [newTask] = await db
      .select()
      .from(task)
      .where(eq(task.id, id))
      .limit(1);

    return Response.json({ task: newTask }, { status: 201 });
  } catch (error) {
    console.error("Create task error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
