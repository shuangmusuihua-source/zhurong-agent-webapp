import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth-server";
import { streamAgentResponse } from "@/lib/agent/client";
import { db } from "@/lib/db";
import { chatSession, message } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

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
    const { prompt, sessionId: existingSessionId, skills } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let currentSessionId = existingSessionId;
    let agentSessionId: string | undefined;

    if (currentSessionId) {
      const existingSession = await db
        .select()
        .from(chatSession)
        .where(
          and(eq(chatSession.id, currentSessionId), eq(chatSession.userId, session.user.id))
        )
        .limit(1);

      if (existingSession[0]) {
        agentSessionId = existingSession[0].agentSessionId ?? undefined;
      } else {
        currentSessionId = undefined;
      }
    }

    if (!currentSessionId) {
      currentSessionId = nanoid();
      await db.insert(chatSession).values({
        id: currentSessionId,
        userId: session.user.id,
        title: prompt.slice(0, 100),
      });
    }

    await db.insert(message).values({
      id: nanoid(),
      sessionId: currentSessionId,
      role: "user",
      content: prompt,
    });

    const encoder = new TextEncoder();
    let newAgentSessionId: string | undefined = agentSessionId;
    let assistantContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamAgentResponse({
            prompt,
            sessionId: agentSessionId,
            skills,
          })) {
            const eventData = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));

            if (event.type === "message") {
              const msg = event.data as Record<string, unknown>;
              if (
                msg.type === "assistant" &&
                "content" in msg &&
                typeof msg.content === "string"
              ) {
                assistantContent += msg.content;
              } else if (
                msg.type === "assistant" &&
                "message" in msg &&
                msg.message &&
                typeof msg.message === "object" &&
                "content" in msg.message
              ) {
                const content = (msg.message as Record<string, unknown>).content;
                if (typeof content === "string") {
                  assistantContent += content;
                } else if (Array.isArray(content)) {
                  for (const block of content) {
                    if (block && typeof block === "object" && block.type === "text" && "text" in block) {
                      assistantContent += String(block.text);
                    }
                  }
                }
              }
            }

            if (event.type === "complete") {
              const completeData = event.data as {
                sessionId: string;
                result: string;
              };
              newAgentSessionId = completeData.sessionId;

              await db
                .update(chatSession)
                .set({
                  agentSessionId: newAgentSessionId,
                  updatedAt: new Date(),
                })
                .where(eq(chatSession.id, currentSessionId!));

              if (assistantContent || completeData.result) {
                await db.insert(message).values({
                  id: nanoid(),
                  sessionId: currentSessionId!,
                  role: "assistant",
                  content: assistantContent || completeData.result,
                });
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                data: { message: error instanceof Error ? error.message : "Stream error" },
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
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
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userSessions = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.userId, session.user.id))
      .orderBy(desc(chatSession.updatedAt))
      .limit(20);

    return new Response(JSON.stringify({ sessions: userSessions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
