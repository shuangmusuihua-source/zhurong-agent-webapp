"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import type { DigitalBuddy, Task } from "@/lib/types";
import { nanoid } from "nanoid";

interface HomeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function HomePage({
  onSelectBuddy,
  onTaskClick,
}: {
  onSelectBuddy: (buddy: DigitalBuddy) => void;
  onTaskClick?: (workspaceId: string) => void;
}) {
  const [buddies, setBuddies] = useState<DigitalBuddy[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<HomeMessage[]>([]);
  const [input, setInput] = useState("");
  const [recommendedBuddies, setRecommendedBuddies] = useState<DigitalBuddy[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [buddiesRes, tasksRes] = await Promise.all([
          fetch("/api/buddies"),
          fetch("/api/tasks?recent=true"),
        ]);
        if (buddiesRes.ok) {
          const data = await buddiesRes.json();
          setBuddies(data.buddies);
        }
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setRecentTasks(data.tasks || []);
        }
      } catch (error) {
        console.error("Failed to load home data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const userMessage: HomeMessage = {
      id: nanoid(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.needsBuddy && data.buddyIds.length > 0) {
          const recommended = buddies.filter((b) => data.buddyIds.includes(b.id));
          setRecommendedBuddies(recommended);
          setMessages((prev) => [
            ...prev,
            {
              id: nanoid(),
              role: "assistant",
              content: data.reply || `我为你找到了 ${recommended.length} 个合适的伙伴，看看哪个适合你：`,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: nanoid(),
              role: "assistant",
              content: data.reply || "你可以选择一个伙伴来帮你，或者告诉我你想做什么，我来推荐。",
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant",
            content: "暂时无法识别你的意图，请直接选择一个伙伴吧。",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: "暂时无法识别你的意图，请直接选择一个伙伴吧。",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-1">数字伙伴</h1>
            <p className="text-sm text-muted-foreground">
              选择一个伙伴，或直接描述你的需求
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {buddies.map((buddy) => (
              <button
                key={buddy.id}
                onClick={() => onSelectBuddy(buddy)}
                className="flex flex-col items-start p-5 rounded-2xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-lg font-bold mb-3 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                  {buddy.name[0]}
                </div>
                <h3 className="text-sm font-semibold mb-1">{buddy.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {buddy.description}
                </p>
                {(() => {
                  const tags = typeof buddy.tags === "string" ? JSON.parse(buddy.tags as string) : buddy.tags;
                  return tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-secondary text-[11px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </button>
            ))}
          </div>

          {recommendedBuddies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold mb-3">推荐伙伴</h2>
              <div className="flex flex-col gap-2">
                {recommendedBuddies.map((buddy) => (
                  <button
                    key={buddy.id}
                    onClick={() => onSelectBuddy(buddy)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold flex-shrink-0">
                      {buddy.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{buddy.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{buddy.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-4 mb-8">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {recentTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3">最近任务</h2>
              <div className="flex flex-col gap-2">
                {recentTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task.workspaceId)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                      {task.buddyAvatar ?? task.buddyName?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.buddyName ?? "伙伴"}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.status === "running" ? "执行中" : task.status === "completed" ? "已完成" : task.status === "pending" ? "等待中" : "失败"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="描述你的需求，我来推荐合适的伙伴..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-secondary text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}