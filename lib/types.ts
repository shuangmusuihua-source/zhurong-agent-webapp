export interface Workspace {
  id: string;
  name: string;
  description?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "buddy";
  content: string;
  buddyName?: string;
  buddyAvatar?: string;
  isStreaming?: boolean;
  toolStatus?: string;
}

export interface Product {
  id: string;
  type: "slides" | "document" | "code" | "image";
  name: string;
  status: "draft" | "generating" | "completed" | "error";
  createdAt: Date;
}

export interface ContextFile {
  id: string;
  name: string;
  type: "file" | "url" | "text";
}

export const TOOL_LABELS: Record<string, string> = {
  "mcp__web-search__WebSearch": "正在联网搜索...",
  WebSearch: "正在联网搜索...",
  WebFetch: "正在抓取网页...",
  Bash: "正在执行命令...",
  Read: "正在读取文件...",
};

export const BUDDY_KEYWORDS = ["幻灯片", "PPT", "ppt", "slides", "演示"];
