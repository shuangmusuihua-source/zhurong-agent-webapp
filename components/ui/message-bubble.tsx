"use client";

import React, { useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2, Globe, Terminal, FileText, Search, ArrowDownToLine } from "lucide-react";
import { computePosition, flip, offset } from "@floating-ui/dom";
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

interface MessageBubbleProps {
  msg: Message;
  onQuoteText?: (text: string) => void;
}

export const MessageBubble = React.memo(function MessageBubble({ msg, onQuoteText }: MessageBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedTextRef = useRef("");

  const showPopover = useCallback((range: Range) => {
    const el = popoverRef.current;
    if (!el) return;

    selectedTextRef.current = window.getSelection()?.toString().trim() || "";

    const rect = range.getBoundingClientRect();
    const virtualEl = { getBoundingClientRect: () => rect };

    computePosition(virtualEl, el, {
      placement: "top",
      middleware: [flip(), offset(8)],
    }).then(({ x, y }) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    });

    el.style.display = "block";
  }, []);

  const hidePopover = useCallback(() => {
    const el = popoverRef.current;
    if (el) el.style.display = "none";
    selectedTextRef.current = "";
  }, []);

  const handleBringToInput = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = selectedTextRef.current;
    if (!text) return;
    hidePopover();
    onQuoteText?.(text);
    setTimeout(() => {
      window.getSelection()?.removeAllRanges();
    }, 200);
  }, [hidePopover, onQuoteText]);

  useEffect(() => {
    if (!onQuoteText) return;

    const onMouseUp = (e: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        hidePopover();
        return;
      }
      const range = selection.getRangeAt(0);
      const bubble = bubbleRef.current;
      if (!bubble || !bubble.contains(range.commonAncestorContainer)) {
        hidePopover();
        return;
      }
      showPopover(range);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) return;
      hidePopover();
    };
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [onQuoteText, showPopover, hidePopover]);

  return (
    <div
      ref={bubbleRef}
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

      {onQuoteText && (
        <div
          ref={popoverRef}
          style={{ display: "none" }}
          className="fixed z-50"
        >
          <button
            onMouseDown={handleBringToInput}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-popover text-popover-foreground shadow-lg border border-border text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            带入对话框
          </button>
        </div>
      )}
    </div>
  );
});