import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { digitalBuddy } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth-server";
import { headers } from "next/headers";

const anthropicClient = new Anthropic();

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const buddies = await db.select().from(digitalBuddy);
    const buddyList = buddies.map((b) => ({
      id: b.id,
      name: b.name,
      skillId: b.skillId,
      description: b.description,
      tags: typeof b.tags === "string" ? JSON.parse(b.tags) : b.tags,
    }));

    const response = await anthropicClient.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "astron-code-latest",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      system: `你是一个意图识别助手。根据用户的消息，判断用户是否需要以下数字伙伴的帮助。

可用的数字伙伴：
${buddyList.map((b) => `- ID: ${b.id}, 名称: ${b.name}, 能力: ${b.description}, 标签: ${(b.tags as string[]).join("/")}`).join("\n")}

请返回 JSON 格式（不要其他内容）：
{
  "needsBuddy": boolean,
  "buddyIds": string[],  // 推荐的伙伴 ID 列表，如果 needsBuddy 为 false 则为空数组
  "reply": string  // 给用户的简短回复
}

判断规则：
- 如果用户描述了一个具体的任务需求（做PPT、做幻灯片、做课件等），needsBuddy 为 true，并推荐最匹配的伙伴
- 如果用户只是闲聊或提问，needsBuddy 为 false
- 如果不确定，needsBuddy 为 true，推荐所有可能相关的伙伴`,
    });

    const textBlock = response.content[0];
    if (textBlock.type !== "text") {
      return Response.json({ needsBuddy: false, buddyIds: [], reply: "请告诉我你想做什么" });
    }

    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);
    return Response.json({
      needsBuddy: result.needsBuddy ?? false,
      buddyIds: result.buddyIds ?? [],
      reply: result.reply ?? "",
    });
  } catch (error) {
    console.error("Intent recognition error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
