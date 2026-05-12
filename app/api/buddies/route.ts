import { db } from "@/lib/db";
import { digitalBuddy } from "@/lib/db/schema";

export async function GET() {
  try {
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
