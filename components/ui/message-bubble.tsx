"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader2, Globe, Terminal, FileText, Search } from "lucide-react";
import { SquircleContainer } from "@/components/ui/squircle-container";
import type { Message } from "@/lib/types";

const MarkdownRenderer = dynamic(
  () => import("@/components/ui/markdown-renderer").then((m) => m.MarkdownRenderer),
  { ssr: false }
);

const TOOL_ICONS: Record<string, React.ReactNode> = {
  "搜索": <Search className="w-4 h-4 text-primary animate-wiggle" />,
  "网页": <Globe className="w-4 h-4 text-green-500 animate-wiggle" />,
  "命令": <Terminal className="w-4 h-4 text-teal-500 animate-wiggle" />,
  "文件": <FileText className="w-4 h-4 text-orange-500 animate-wiggle" />,
};

function getToolIcon(toolStatus?: string) {
  if (!toolStatus) return null;
  for (const [key, icon] of Object.entries(TOOL_ICONS)) {
    if (toolStatus.includes(key)) return icon;
  }
  return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />;
}

export const MessageBubble = React.memo(function MessageBubble({ msg }: { msg: Message }) {
  return (
    <div
      className={`flex gap-3 max-w-[720px] ${
        msg.role === "user" ? "self-end flex-row-reverse items-start" : ""
      }`}
    >
      {msg.role === "user" && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          Z
        </div>
      )}
      {msg.role === "assistant" && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-400 to-green-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          AI
        </div>
      )}
      {msg.role === "buddy" && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          {msg.buddyAvatar}
        </div>
      )}

      <div className={msg.role === "user" ? "" : "flex-1 min-w-0"}>
        {msg.role === "user" ? (
          <SquircleContainer cornerRadius={16} className="message-appear px-4 py-3 bg-message-user text-message-user-fg text-sm leading-relaxed" style={{ borderTopRightRadius: 0 }}>
            {msg.content}
          </SquircleContainer>
        ) : msg.toolStatus ? (
          <div className="message-appear flex items-center gap-2 px-3.5 py-2 bg-tool-status-bg border border-tool-status-border rounded-lg text-sm text-tool-status-fg">
            {getToolIcon(msg.toolStatus)}
            <span>{msg.toolStatus}</span>
          </div>
        ) : msg.content === "思考中..." ? (
          <div className="message-appear flex items-center gap-2 px-3.5 py-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>思考中...</span>
          </div>
        ) : msg.content ? (
          <SquircleContainer cornerRadius={16} className={`message-appear px-4 py-3 bg-message-ai text-message-ai-fg text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert ${msg.isStreaming ? "typing-cursor" : ""}`} style={{ borderBottomLeftRadius: 0 }}>
            <MarkdownRenderer content={msg.content} />
          </SquircleContainer>
        ) : null}
      </div>
    </div>
  );
});
