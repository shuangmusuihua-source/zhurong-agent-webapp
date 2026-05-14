"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Globe, Terminal, FileText, Search, ArrowUp, ArrowDownToLine, Square, RotateCcw, Check, ChevronUp, ChevronDown, X } from "lucide-react";
import { computePosition, flip, offset } from "@floating-ui/dom";
import { useScrollHide } from "@/hooks/use-scroll-hide";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { SquircleContainer } from "@/components/ui/squircle-container";
import type { Message, TaskStatus } from "@/lib/types";

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

interface TaskInfo {
  taskId: string;
  buddyName?: string;
  buddyAvatar?: string;
  status: TaskStatus;
  toolStatus?: string;
  agentSessionId?: string;
}

interface QuestionData {
  question: string;
  header: string;
  options?: Array<{ label: string; description?: string }>;
  multiSelect?: boolean;
  type?: "options" | "outline";
  items?: string[];
}

function OutlineCard({
  question,
  items,
  onAnswer,
}: {
  question: QuestionData;
  items: string[];
  onAnswer: (selected: string[]) => void;
}) {
  const [list, setList] = useState(items);
  const [newItem, setNewItem] = useState("");

  const moveItem = (index: number, direction: "up" | "down") => {
    const newList = [...list];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setList(newList);
  };

  const removeItem = (index: number) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    if (newItem.trim()) {
      setList((prev) => [...prev, newItem.trim()]);
      setNewItem("");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-message-ai p-4 space-y-3">
      <div>
        <span className="text-xs font-medium text-primary">{question.header}</span>
        <p className="text-sm text-foreground mt-0.5">{question.question}</p>
      </div>
      <div className="space-y-1">
        {list.map((item, index) => (
          <div key={index} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/50 text-sm">
            <span className="text-xs text-muted-foreground w-5 text-center">{index + 1}</span>
            <span className="flex-1 min-w-0 text-foreground">{item}</span>
            <button
              onClick={() => moveItem(index, "up")}
              disabled={index === 0}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => moveItem(index, "down")}
              disabled={index === list.length - 1}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => removeItem(index)}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="添加新页..."
          className="flex-1 bg-transparent border border-border rounded-lg px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          添加
        </button>
      </div>
      <button
        onClick={() => onAnswer(list)}
        disabled={list.length === 0}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        确认大纲
      </button>
    </div>
  );
}

function QuestionCard({
  question,
  onAnswer,
}: {
  question: QuestionData;
  onAnswer: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (label: string) => {
    if (question.multiSelect) {
      setSelected((prev) =>
        prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
      );
    } else {
      setSelected((prev) => (prev.includes(label) ? [] : [label]));
    }
  };

  return (
    <div className="rounded-xl border border-border bg-message-ai p-4 space-y-3">
      <div>
        <span className="text-xs font-medium text-primary">{question.header}</span>
        <p className="text-sm text-foreground mt-0.5">{question.question}</p>
      </div>
      <div className="space-y-1.5">
        {(question.options ?? []).map((opt) => {
          const isSelected = selected.includes(opt.label);
          return (
            <button
              key={opt.label}
              onClick={() => toggle(opt.label)}
              className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                isSelected
                  ? "bg-primary/10 border border-primary/30 text-foreground"
                  : "bg-secondary/50 border border-transparent hover:bg-secondary text-foreground"
              }`}
            >
              <span className={`mt-0.5 w-4 h-4 rounded-${question.multiSelect ? "md" : "full"} border flex-shrink-0 flex items-center justify-center transition-colors ${
                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
              }`}>
                {isSelected && <Check className="w-3 h-3" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-medium">{opt.label}</span>
                {opt.description && (
                  <span className="block text-xs text-muted-foreground mt-0.5">{opt.description}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onAnswer(selected)}
        disabled={selected.length === 0}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        确认
      </button>
    </div>
  );
}

const MessageBubble = React.memo(function MessageBubble({ msg }: { msg: Message }) {
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

export function ChatArea({
  messages,
  buddyRecommendations = [],
  onSendMessage,
  onSelectBuddy,
  isLoading = false,
  className,
  activeTask,
  onStopTask,
  onRetryTask,
  pendingQuestion,
  onQuestionAnswered,
}: {
  messages: Message[];
  buddyRecommendations?: Array<{ id: string; name: string; avatar: string; description: string }>;
  onSendMessage: (content: string) => void;
  onSelectBuddy?: (buddyId: string) => void;
  isLoading?: boolean;
  className?: string;
  activeTask?: TaskInfo;
  onStopTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  pendingQuestion?: {
    questions: Array<{
      question: string;
      header: string;
      options?: Array<{ label: string; description?: string }>;
      multiSelect?: boolean;
      type?: "options" | "outline";
      items?: string[];
    }>;
  };
  onQuestionAnswered?: (questionIndex: number, answers: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { textareaRef, resize: resizeTextarea } = useAutoResizeTextarea();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollHideRef = useScrollHide();
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedTextRef = useRef("");
  const isNearBottomRef = useRef(true);
  const scrollRafRef = useRef<number>(0);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    // Measure initial position (handles loaded conversations)
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
    const isStreaming = messages.some(m => m.isStreaming);
    scrollRafRef.current = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: isStreaming ? "auto" : "smooth",
      });
    });
    return () => cancelAnimationFrame(scrollRafRef.current);
  }, [messages]);

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
    setInput(text);
    textareaRef.current?.focus();
    setTimeout(() => {
      window.getSelection()?.removeAllRanges();
    }, 200);
  }, [hidePopover]);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        hidePopover();
        return;
      }
      const range = selection.getRangeAt(0);
      const container = messagesContainerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
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
  }, [showPopover, hidePopover]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
    resizeTextarea();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    resizeTextarea();
  };

  const isTaskRunning = activeTask?.status === "running";
  const isTaskFailed = activeTask?.status === "failed";
  const isTaskPending = activeTask?.status === "pending";
  const isWaitingForInput = pendingQuestion !== undefined && pendingQuestion.questions.length > 0;

  // 追问确认：合并选项 + 输入框文字，带 questionIndex
  const handleQuestionConfirm = (questionIndex: number, selectedOptions: string[]) => {
    const parts = [...selectedOptions];
    if (input.trim()) {
      parts.push(input.trim());
    }
    if (parts.length > 0) {
      onQuestionAnswered?.(questionIndex, parts);
      setInput("");
    }
  };

  return (
    <SquircleContainer
      cornerRadius={16}
      className={`flex flex-col bg-chat-bg overflow-hidden relative ${className ?? ""}`}
    >
      <div className="flex items-center justify-between px-5 py-3.5">
        <span className="text-sm font-medium text-muted-foreground">
          {isWaitingForInput ? "等待输入" : isTaskRunning ? "任务执行中" : isTaskFailed ? "任务失败" : "对话"}
        </span>
        {activeTask && (
          <span className="text-xs text-muted-foreground">
            {activeTask.buddyName ?? "伙伴"}
          </span>
        )}
      </div>

      {/* 消息列表始终显示 */}
      <div ref={(el) => { messagesContainerRef.current = el; scrollHideRef.current = el; }} className="flex-1 overflow-y-auto p-5 pb-20 flex flex-col gap-5">
        {messages.length === 0 && !isTaskRunning && !isTaskFailed && !isWaitingForInput && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm">
              {isTaskPending ? `描述你想让${activeTask?.buddyName ?? "伙伴"}完成的任务` : "描述你的任务，开始对话"}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部区域：三种形态 */}
      {isTaskRunning && !isWaitingForInput ? (
        /* 形态 2：执行中 — 伙伴名 + 工具状态 + 停止按钮 */
        <SquircleContainer cornerRadius={16} className="absolute bottom-4 left-5 right-5 backdrop-blur-sm bg-white/80 dark:bg-chat-bg/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
              {activeTask.buddyAvatar ?? activeTask.buddyName?.[0] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{activeTask.buddyName ?? "伙伴"} 正在执行</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {activeTask.toolStatus ?? "正在处理你的任务..."}
              </div>
            </div>
            <button
              onClick={() => onStopTask?.(activeTask.taskId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors flex-shrink-0"
            >
              <Square className="w-3.5 h-3.5" />
              停止
            </button>
          </div>
        </SquircleContainer>
      ) : isWaitingForInput ? (
        /* 形态 3：追问 — QuestionCard + 输入框兜底 + 确认按钮 */
        <div className="absolute bottom-4 left-5 right-5 flex flex-col gap-2">
          {/* QuestionCard 可滚动区域 */}
          <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
            {pendingQuestion!.questions.map((q, qi) => {
              if (q.type === "outline" && q.items) {
                return (
                  <OutlineCard
                    key={qi}
                    question={q}
                    items={q.items}
                    onAnswer={(selected) => handleQuestionConfirm(qi, selected)}
                  />
                );
              }
              return (
                <QuestionCard
                  key={qi}
                  question={q}
                  onAnswer={(selected) => handleQuestionConfirm(qi, selected)}
                />
              );
            })}
          </div>
          {/* 输入框兜底 */}
          <SquircleContainer cornerRadius={16} className="flex items-center gap-2 backdrop-blur-sm bg-white/80 dark:bg-chat-bg/80 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
              {activeTask?.buddyAvatar ?? activeTask?.buddyName?.[0] ?? "?"}
            </div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) {
                    handleQuestionConfirm(0, []);
                  }
                }
              }}
              placeholder="也可以直接输入回答..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-[120px]"
            />
            <button
              onClick={() => {
                if (input.trim()) {
                  handleQuestionConfirm(0, []);
                }
              }}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </SquircleContainer>
        </div>
      ) : (
        /* 形态 1：空闲/失败 — 普通输入框 + 重试按钮 */
        <SquircleContainer cornerRadius={16} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[60%] flex items-center gap-2 backdrop-blur-xl bg-white/80 dark:bg-chat-bg/70 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          {isTaskFailed && (
            <button
              onClick={() => onRetryTask?.(activeTask.taskId)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重试
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isTaskPending ? `描述你想让${activeTask?.buddyName ?? "伙伴"}完成的任务...` : isTaskFailed ? "输入消息继续，或点击重试..." : "描述你的任务..."}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-[120px]"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </SquircleContainer>
      )}

      {buddyRecommendations.length > 0 && (
        <div className="absolute bottom-16 left-0 right-0 px-5 py-3 backdrop-blur-sm bg-chat-bg/80">
          <p className="text-xs text-muted-foreground mb-2">推荐数字伙伴</p>
          <div className="flex gap-2">
            {buddyRecommendations.map((buddy) => (
              <button
                key={buddy.id}
                onClick={() => onSelectBuddy?.(buddy.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm"
              >
                <span>{buddy.avatar}</span>
                <span>{buddy.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
    </SquircleContainer>
  );
}