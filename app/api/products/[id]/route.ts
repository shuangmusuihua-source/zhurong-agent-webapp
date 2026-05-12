import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { product } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

// 获取单个产物 / 预览 / 下载
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const action = req.nextUrl.searchParams.get("action"); // 'preview' | 'download'

  try {
    const [item] = await db
      .select()
      .from(product)
      .where(eq(product.id, id))
      .limit(1);

    if (!item) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // 默认返回产物元数据
    if (!action) {
      return Response.json({ product: item });
    }

    if (!item.content) {
      return Response.json({ error: "Product has no content" }, { status: 404 });
    }

    // content 可能是文件路径，尝试读取文件内容
    let content = item.content;
    if (existsSync(item.content)) {
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
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      return new Response(content, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (action === "download") {
      const ext = isHtml ? "html" : item.type === "code" ? "ts" : "txt";
      const filename = `${item.name}.${ext}`;
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
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// 删除产物
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [existing] = await db
      .select()
      .from(product)
      .where(eq(product.id, id))
      .limit(1);

    if (!existing) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    await db.delete(product).where(eq(product.id, id));
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
