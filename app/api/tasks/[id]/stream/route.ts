import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { task, workspace } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/auth-server";
import { headers } from "next/headers";
import { activeTasks } from "@/lib/agent/active-tasks";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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

    // 检查 task 状态
    if (existing.status !== "running") {
      return Response.json({ error: "Task is not running", status: existing.status }, { status: 400 });
    }

    const activeTask = activeTasks.get(id);
    if (!activeTask?.broadcaster) {
      return Response.json({ error: "No active stream for this task" }, { status: 404 });
    }

    const broadcaster = activeTask.broadcaster;
    const encoder = new TextEncoder();
    const subscriberId = `reconnect-${Date.now()}`;
    let heartbeatRef: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream({
      start(controller) {
        // 1. 发送 reconnect_snapshot：累积文本 + 工具状态 + 产物列表
        const snapshot = broadcaster.getSnapshot();
        const snapshotEvent = {
          type: "reconnect_snapshot",
          fullText: activeTask.accumulatedText ?? "",
          toolStatus: snapshot.lastToolStatus,
          products: snapshot.products,
        };
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshotEvent)}\n\n`));
        } catch {
          return;
        }

        // 2. 如果 Agent 被 canUseTool 暂停（有 pendingQuestionResolve），恢复追问 UI
        if (activeTask.pendingQuestionResolve && activeTask.pendingQuestionInput) {
          const questions = activeTask.pendingQuestionInput.questions ?? activeTask.pendingQuestionInput;
          const askEvent = { type: "ask_user", questions, toolUseId: "reconnect" };
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(askEvent)}\n\n`));
          } catch {
            return;
          }
        }

        // 3. 订阅 broadcaster 接收后续事件
        broadcaster.subscribe(subscriberId, controller);

        // 4. 心跳
        heartbeatRef = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`));
          } catch {
            clearInterval(heartbeatRef);
            broadcaster.unsubscribe(subscriberId);
          }
        }, 30000);
      },
      cancel() {
        broadcaster.unsubscribe(subscriberId);
        if (heartbeatRef) clearInterval(heartbeatRef);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Stream reconnect error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
