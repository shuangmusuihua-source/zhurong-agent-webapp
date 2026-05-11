"use client";

import { useState, useRef, useEffect } from "react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Loader2, Globe, Terminal, FileText, Search, CornerDownLeft } from "lucide-react";
import type { Message } from "@/lib/types";

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

export function ChatArea({
  messages,
  buddyRecommendations = [],
  onSendMessage,
  onSelectBuddy,
  isLoading = false,
}: {
  messages: Message[];
  buddyRecommendations?: Array<{ id: string; name: string; avatar: string; description: string }>;
  onSendMessage: (content: string) => void;
  onSelectBuddy: (buddyId: string) => void;
  isLoading?: boolean;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col bg-chat-bg rounded-2xl overflow-hidden h-full relative">
      <div className="flex items-center justify-between px-5 py-3.5">
        <span className="text-sm font-medium text-muted-foreground">对话</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-20 flex flex-col gap-5">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm">描述你的任务，开始对话</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
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
                <div className="message-appear px-4 py-3 bg-message-user text-message-user-fg rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                  {msg.content}
                </div>
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
                <div className={`message-appear px-4 py-3 bg-message-ai text-message-ai-fg rounded-2xl rounded-bl-sm text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert ${msg.isStreaming ? "typing-cursor" : ""}`}>
                  <MarkdownRenderer content={msg.content} />
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {buddyRecommendations.length > 0 && (
        <div className="absolute bottom-16 left-0 right-0 px-5 py-3 bg-chat-bg/80 backdrop-blur-md">
          <p className="text-xs text-muted-foreground mb-2">推荐数字伙伴</p>
          <div className="flex gap-2">
            {buddyRecommendations.map((buddy) => (
              <button
                key={buddy.id}
                onClick={() => onSelectBuddy(buddy.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm"
              >
                <span>{buddy.avatar}</span>
                <span>{buddy.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-5 right-5 flex items-center gap-2 backdrop-blur-xl bg-white/80 dark:bg-chat-bg/70 rounded-2xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="描述你的任务..."
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-[120px]"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
