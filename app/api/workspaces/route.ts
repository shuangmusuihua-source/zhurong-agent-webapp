import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth-server";
import { db } from "@/lib/db";
import { workspace } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// 获取用户的 workspace 列表
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const workspaces = await db
      .select()
      .from(workspace)
      .where(eq(workspace.userId, session.user.id))
      .orderBy(desc(workspace.lastActiveAt));

    return new Response(JSON.stringify({ workspaces }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get workspaces error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// 创建新 workspace
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = nanoid();
    await db.insert(workspace).values({
      id,
      userId: session.user.id,
      name,
      description: description || null,
    });

    const newWorkspace = await db
      .select()
      .from(workspace)
      .where(eq(workspace.id, id))
      .limit(1);

    return new Response(JSON.stringify({ workspace: newWorkspace[0] }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create workspace error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
