"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Globe, Terminal, FileText, Search, ArrowUp, ArrowDownToLine, Square, RotateCcw, Check } from "lucide-react";
import { computePosition, flip, offset } from "@floating-ui/dom";
import { useScrollHide } from "@/hooks/use-scroll-hide";
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
}

function QuestionCard({
  question,
  onAnswer,
}: {
  question: {
    question: string;
    header: string;
    options: Array<{ label: string; description?: string }>;
    multiSelect?: boolean;
  };
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
        {question.options.map((opt) => {
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
      options: Array<{ label: string; description?: string }>;
      multiSelect?: boolean;
    }>;
  };
  onQuestionAnswered?: (answers: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollHideRef = useScrollHide();
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedTextRef = useRef("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const isTaskRunning = activeTask?.status === "running";
  const isTaskFailed = activeTask?.status === "failed";
  const isTaskPending = activeTask?.status === "pending";

  return (
    <SquircleContainer
      cornerRadius={16}
      className={`flex flex-col bg-chat-bg overflow-hidden relative ${className ?? ""}`}
    >
      <div className="flex items-center justify-between px-5 py-3.5">
        <span className="text-sm font-medium text-muted-foreground">
          {isTaskRunning ? "任务执行中" : isTaskFailed ? "任务失败" : "对话"}
        </span>
        {activeTask && (
          <span className="text-xs text-muted-foreground">
            {activeTask.buddyName ?? "伙伴"}
          </span>
        )}
      </div>

      {/* 消息列表始终显示 */}
      <div ref={(el) => { messagesContainerRef.current = el; scrollHideRef.current = el; }} className="flex-1 overflow-y-auto p-5 pb-20 flex flex-col gap-5">
        {messages.length === 0 && !isTaskRunning && !isTaskFailed && (
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
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* AskUserQuestion 交互面板 */}
      {pendingQuestion && pendingQuestion.questions.length > 0 && (
        <div className="px-5 pb-2">
          {pendingQuestion.questions.map((q, qi) => (
            <QuestionCard
              key={qi}
              question={q}
              onAnswer={(selected) => onQuestionAnswered?.(selected)}
            />
          ))}
        </div>
      )}

      {buddyRecommendations.length > 0 && (
        <div className="absolute bottom-16 left-0 right-0 px-5 py-3 bg-chat-bg/80 backdrop-blur-md">
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

      {/* 底部区域：pending/正常时为输入框，running时为状态面板，failed时为重试 */}
      {isTaskRunning ? (
        <SquircleContainer cornerRadius={16} className="absolute bottom-4 left-5 right-5 backdrop-blur-xl bg-white/80 dark:bg-chat-bg/70 px-4 py-3 shadow-sm">
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
      ) : isTaskFailed ? (
        <SquircleContainer cornerRadius={16} className="absolute bottom-4 left-5 right-5 backdrop-blur-xl bg-white/80 dark:bg-chat-bg/70 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive text-sm font-bold flex-shrink-0">
              {activeTask.buddyAvatar ?? activeTask.buddyName?.[0] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">任务执行失败</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {activeTask.buddyName ?? "伙伴"} 执行过程中遇到问题
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onRetryTask?.(activeTask.taskId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重试
              </button>
              <button
                onClick={() => onSendMessage("继续对话")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors"
              >
                继续
              </button>
            </div>
          </div>
        </SquircleContainer>
      ) : (
        <SquircleContainer cornerRadius={16} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[60%] flex items-center gap-2 backdrop-blur-xl bg-white/80 dark:bg-chat-bg/70 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isTaskPending ? `描述你想让${activeTask?.buddyName ?? "伙伴"}完成的任务...` : "描述你的任务..."}
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
    </SquircleContainer>
  );
}
