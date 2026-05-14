import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { digitalBuddy } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth-server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buddies = await db.select().from(digitalBuddy);

    return Response.json({
      buddies: buddies.map((b) => ({
        id: b.id,
        name: b.name,
        avatar: b.avatar,
        description: b.description,
        skillId: b.skillId,
        tags: b.tags ? JSON.parse(b.tags) : [],
      })),
    });
  } catch (error) {
    console.error("Get buddies error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
