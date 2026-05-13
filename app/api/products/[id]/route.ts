import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { product, workspace } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { isPathSafe } from "@/lib/utils/path-safety";
import { auth } from "@/lib/auth/auth-server";
import { headers } from "next/headers";

async function verifyProductOwnership(productId: string, userId: string) {
  const [item] = await db
    .select()
    .from(product)
    .where(eq(product.id, productId))
    .limit(1);

  if (!item) return null;

  const [ws] = await db
    .select()
    .from(workspace)
    .where(and(eq(workspace.id, item.workspaceId), eq(workspace.userId, userId)))
    .limit(1);

  return ws ? item : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const action = req.nextUrl.searchParams.get("action");

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await verifyProductOwnership(id, session.user.id);
    if (!item) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    if (!action) {
      return Response.json({ product: item });
    }

    if (!item.content) {
      return Response.json({ error: "Product has no content" }, { status: 404 });
    }

    let content = item.content;
    if (existsSync(item.content) && isPathSafe(item.content)) {
      try {
        content = await readFile(item.content, "utf-8");
      } catch {
        // 读取失败，使用原始 content
      }
    }

    const isHtml = item.type === "slides" || content.trim().startsWith("<!DOCTYPE") || content.trim().startsWith("<html");

    if (action === "preview") {
      if (isHtml) {
        return new Response(content, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Security-Policy":
              "default-src 'self' 'unsafe-inline' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      return new Response(content, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (action === "download") {
      const filename = item.name;
      return new Response(content, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Get product error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await verifyProductOwnership(id, session.user.id);
    if (!item) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    await db.delete(product).where(eq(product.id, id));
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
