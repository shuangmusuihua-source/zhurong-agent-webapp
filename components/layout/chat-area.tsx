"use client";

import { useState, useRef, useEffect } from "react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Loader2, Globe, Terminal, FileText, Search } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "buddy";
  content: string;
  buddyName?: string;
  buddyAvatar?: string;
  isStreaming?: boolean;
  toolStatus?: string;
}

interface BuddyRecommendation {
  id: string;
  name: string;
  avatar: string;
  description: string;
}

interface ChatAreaProps {
  messages: Message[];
  buddyRecommendations?: BuddyRecommendation[];
  onSendMessage: (message: string) => void;
  onSelectBuddy?: (buddyId: string) => void;
  isLoading?: boolean;
}

function getToolIcon(toolStatus?: string) {
  if (!toolStatus) return null;
  if (toolStatus.includes("搜索")) return <Search className="w-4 h-4 text-blue-500 animate-wiggle" />;
  if (toolStatus.includes("网页")) return <Globe className="w-4 h-4 text-green-500 animate-wiggle" />;
  if (toolStatus.includes("命令")) return <Terminal className="w-4 h-4 text-purple-500 animate-wiggle" />;
  if (toolStatus.includes("文件")) return <FileText className="w-4 h-4 text-orange-500 animate-wiggle" />;
  return <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />;
}

export function ChatArea({
  messages,
  buddyRecommendations = [],
  onSendMessage,
  onSelectBuddy,
  isLoading = false,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">开始新的对话</p>
              <p className="text-sm">描述你的任务，我会推荐合适的数字伙伴</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`message-bubble ${
                    msg.role === "user"
                      ? "message-bubble-user"
                      : "message-bubble-assistant"
                  }`}
                >
                  {msg.role === "buddy" && msg.buddyName && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      {msg.buddyAvatar && (
                        <span className="text-base">{msg.buddyAvatar}</span>
                      )}
                      <span>{msg.buddyName}</span>
                    </div>
                  )}
                  <div className={msg.isStreaming ? "typing-cursor" : ""}>
                    {msg.role === "user" ? (
                      <span>{msg.content}</span>
                    ) : msg.role === "assistant" && msg.toolStatus ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getToolIcon(msg.toolStatus)}
                        <span>{msg.toolStatus}</span>
                      </div>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* 数字伙伴推荐卡片 */}
            {buddyRecommendations.length > 0 && (
              <div className="bg-muted/50 rounded-xl p-4 max-w-2xl">
                <p className="text-sm text-muted-foreground mb-3">
                  💡 推荐数字伙伴
                </p>
                <div className="flex flex-wrap gap-2">
                  {buddyRecommendations.map((buddy) => (
                    <button
                      key={buddy.id}
                      onClick={() => onSelectBuddy?.(buddy.id)}
                      className="buddy-card flex items-center gap-2"
                    >
                      <span className="text-xl">{buddy.avatar}</span>
                      <div>
                        <p className="font-medium text-sm">{buddy.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {buddy.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="描述你的任务..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {isLoading ? "处理中..." : "发送"}
          </button>
        </form>
      </div>
    </div>
  );
}
