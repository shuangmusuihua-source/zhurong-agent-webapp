export interface Workspace {
  id: string;
  name: string;
  description?: string;
}

export type TaskStatus = "running" | "completed" | "failed" | "pending";

export interface Task {
  id: string;
  workspaceId: string;
  buddyId: string;
  conversationId?: string;
  status: TaskStatus;
  agentSessionId?: string;
  buddyName?: string;
  buddyAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
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
  taskId?: string;
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

export interface DigitalBuddy {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  skillId: string;
  tags?: string[];
}

export const TOOL_LABELS: Record<string, string> = {
  "mcp__web-search__WebSearch": "正在联网搜索...",
  WebSearch: "正在联网搜索...",
  WebFetch: "正在抓取网页...",
  Bash: "正在执行命令...",
  Read: "正在读取文件...",
};

export const BUDDY_KEYWORD_MAP: Record<string, string[]> = {
  "guizang-ppt-skill": ["PPT", "ppt", "杂志风", "发布会", "演讲", "演示文稿"],
  "frontend-slides": ["幻灯片", "slides", "技术分享", "产品展示", "动画演示"],
  "kami-html-slides": ["教学", "课件", "知识分享", "中文排版", "课堂"],
};

export const ALL_BUDDY_KEYWORDS = Object.values(BUDDY_KEYWORD_MAP).flat();
