import { db } from "@/lib/db";
import { product, workspace, task } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/auth-server";
import { headers } from "next/headers";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");
    const workspaceId = url.searchParams.get("workspaceId");

    if (!taskId && !workspaceId) {
      return Response.json(
        { error: "taskId or workspaceId is required" },
        { status: 400 }
      );
    }

    // 验证 workspace 归属
    if (workspaceId) {
      const [ws] = await db
        .select()
        .from(workspace)
        .where(and(eq(workspace.id, workspaceId), eq(workspace.userId, session.user.id)))
        .limit(1);

      if (!ws) {
        return Response.json({ products: [] });
      }

      const products = await db
        .select()
        .from(product)
        .where(eq(product.workspaceId, workspaceId))
        .orderBy(desc(product.createdAt));

      return Response.json({ products });
    }

    // 按 taskId 查询：先找 task 的 workspaceId，再验证归属
    const [t] = await db
      .select()
      .from(task)
      .where(eq(task.id, taskId!))
      .limit(1);

    if (!t) {
      return Response.json({ products: [] });
    }

    const [ws] = await db
      .select()
      .from(workspace)
      .where(and(eq(workspace.id, t.workspaceId), eq(workspace.userId, session.user.id)))
      .limit(1);

    if (!ws) {
      return Response.json({ products: [] });
    }

    const products = await db
      .select()
      .from(product)
      .where(eq(product.taskId, taskId!))
      .orderBy(desc(product.createdAt));

    return Response.json({ products });
  } catch (error) {
    console.error("Get products error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
