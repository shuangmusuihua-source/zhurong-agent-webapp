import { db } from "@/lib/db";
import { digitalBuddy } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth-server";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buddies = await db.select().from(digitalBuddy);
    return Response.json({ buddies });
  } catch (error) {
    console.error("Get buddies error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
