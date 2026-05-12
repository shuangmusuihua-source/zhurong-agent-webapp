import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { product } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// 获取产物列表（按 taskId 或 workspaceId 筛选）
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");

  if (!taskId && !workspaceId) {
    return Response.json(
      { error: "taskId or workspaceId is required" },
      { status: 400 }
    );
  }

  try {
    let query = db.select().from(product).orderBy(desc(product.createdAt));

    if (taskId) {
      const products = await db
        .select()
        .from(product)
        .where(eq(product.taskId, taskId))
        .orderBy(desc(product.createdAt));
      return Response.json({ products });
    }

    const products = await db
      .select()
      .from(product)
      .where(eq(product.workspaceId, workspaceId!))
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
