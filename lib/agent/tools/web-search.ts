import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// WebSearch 工具输入 Schema
const webSearchInputSchema = {
  query: z.string().describe("搜索关键词"),
};

// WebSearch 工具处理器
async function webSearchHandler(args: { query: string }) {
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.SERPER_API_KEY || "",
      },
      body: JSON.stringify({
        q: args.query,
        gl: "cn", // 地区设置
        hl: "zh-cn", // 语言设置
      }),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `搜索失败: HTTP ${response.status}`,
          },
        ],
        isError: true,
      };
    }

    const data = await response.json();

    // 格式化搜索结果
    const results = [];

    // 有机搜索结果
    if (data.organic && Array.isArray(data.organic)) {
      for (const item of data.organic.slice(0, 5)) {
        results.push({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
        });
      }
    }

    // 知识图谱结果
    if (data.knowledgeGraph) {
      results.push({
        type: "knowledgeGraph",
        title: data.knowledgeGraph.title,
        description: data.knowledgeGraph.description,
      });
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `搜索出错: ${error instanceof Error ? error.message : "未知错误"}`,
        },
      ],
      isError: true,
    };
  }
}

// 创建 WebSearch 工具定义
export const webSearchTool = tool(
  "WebSearch",
  "搜索互联网获取最新信息。当用户询问实时新闻、天气、股价、最新事件等信息时使用此工具。",
  webSearchInputSchema,
  webSearchHandler,
  {
    annotations: {
      title: "联网搜索",
      readOnlyHint: true,
    },
    alwaysLoad: true,
  }
);

// 创建 WebSearch MCP Server
export function createWebSearchMcpServer() {
  return createSdkMcpServer({
    name: "web-search",
    version: "1.0.0",
    tools: [webSearchTool],
    alwaysLoad: true,
  });
}
