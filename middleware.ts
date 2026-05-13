import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 只保护 /api/ 路由，排除 /api/auth/（登录注册等）
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    // Edge Runtime 无法使用 better-sqlite3，这里只做轻量级 cookie 检查
    // 完整的 session 验证由各 API 路由负责
    const sessionCookie = req.cookies.get("better-auth.session_token");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};