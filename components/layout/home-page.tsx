"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { SquircleContainer } from "@/components/ui/squircle-container";
import { ChatInput } from "@/components/ui/chat-input";
import { MessageBubble } from "@/components/ui/message-bubble";
import { useScrollHide } from "@/hooks/use-scroll-hide";
import { useHomeStore } from "@/stores/home-store";
import type { DigitalBuddy, Message } from "@/lib/types";
import { nanoid } from "nanoid";

interface HomeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function HomePage({
  onSelectBuddy,
}: {
  onSelectBuddy: (buddy: DigitalBuddy) => void;
}) {
  const homeStore = useHomeStore();
  const [messages, setMessages] = useState<HomeMessage[]>([]);
  const [input, setInput] = useState("");
  const [recommendedBuddies, setRecommendedBuddies] = useState<DigitalBuddy[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useScrollHide();
  const isNearBottomRef = useRef(true);
  const scrollRafRef = useRef<number>(0);

  useEffect(() => {
    if (homeStore.loaded) return;
    async function loadData() {
      try {
        const buddiesRes = await fetch("/api/buddies");
        const store = useHomeStore.getState();
        if (buddiesRes.ok) {
          const data = await buddiesRes.json();
          store.setBuddies(data.buddies);
        }
        store.setLoaded(true);
      } catch (error) {
        console.error("Failed to load home data:", error);
      }
    }
    loadData();
  }, [homeStore.loaded]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    });
    return () => cancelAnimationFrame(scrollRafRef.current);
  }, [messages]);

  const handleQuoteText = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    setSending(true);

    const userMessage: HomeMessage = {
      id: nanoid(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.needsBuddy && data.buddyIds.length > 0) {
          const recommended = homeStore.buddies.filter((b) => data.buddyIds.includes(b.id));
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

  if (!homeStore.loaded) {
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
    <div className="flex-1 flex flex-col min-w-0 relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-1">数字伙伴</h1>
            <p className="text-sm text-muted-foreground">
              选择一个伙伴，或直接描述你的需求
            </p>
          </div>

          {messages.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 items-stretch">
              {homeStore.buddies.map((buddy) => (
                <button
                  key={buddy.id}
                  onClick={() => onSelectBuddy(buddy)}
                  className="text-left w-full h-full"
                >
                  <SquircleContainer
                    cornerRadius={16}
                    className="flex flex-col items-start p-5 bg-secondary/50 hover:bg-primary/5 transition-all text-left group h-full"
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
                  </SquircleContainer>
                </button>
              ))}
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex flex-col gap-5 mb-8">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg as Message} onQuoteText={handleQuoteText} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

                  </div>
      </div>

      {recommendedBuddies.length > 0 && messages.length > 0 && (
        <div className="absolute bottom-16 left-0 right-0 px-5 py-3 backdrop-blur-sm bg-chat-bg/80">
          <p className="text-xs text-muted-foreground mb-2">推荐伙伴</p>
          <div className="flex gap-2">
            {recommendedBuddies.map((buddy) => (
              <button
                key={buddy.id}
                onClick={() => onSelectBuddy(buddy)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm"
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-xs font-bold">
                  {buddy.name[0]}
                </div>
                <span>{buddy.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        isGenerating={sending}
        placeholder="描述你的需求，我来推荐合适的伙伴..."
        className="mx-auto w-[60%]"
      />
    </div>
  );
}
