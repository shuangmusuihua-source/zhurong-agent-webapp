"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { ArrowUp, StopCircle } from "lucide-react";
import { SquircleContainer } from "@/components/ui/squircle-container";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isGenerating: boolean;
  allowSubmitWhileGenerating?: boolean;
  placeholder?: string;
  className?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating,
  placeholder = "输入消息...",
  className,
  leading,
  trailing,
  inputRef,
  allowSubmitWhileGenerating = false,
}: ChatInputProps) {
  const [isComposing, setIsComposing] = useState(false);
  const sendingRef = useRef(false);
  const { textareaRef: internalRef, resize } = useAutoResizeTextarea();

  const setRef = (el: HTMLTextAreaElement | null) => {
    (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    if (typeof inputRef === "function") inputRef(el);
    else if (inputRef) (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
  };

  useEffect(() => {
    if (!isGenerating) sendingRef.current = false;
  }, [isGenerating]);

  const canSubmit = allowSubmitWhileGenerating || !isGenerating;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      if (canSubmit && !sendingRef.current) {
        sendingRef.current = true;
        onSend();
      }
    }
  };

  const handleSendClick = () => {
    if (sendingRef.current) return;
    if (!value.trim() || !canSubmit) return;
    sendingRef.current = true;
    onSend();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    resize();
  };

  return (
    <SquircleContainer
      cornerRadius={16}
      className={`flex items-center gap-2 backdrop-blur-xl bg-white/80 dark:bg-chat-bg/70 px-3 py-2 shadow-[0px_12px_32px_4px_rgba(0,0,0,0.04),0px_8px_20px_rgba(0,0,0,0.08)] dark:shadow-[0px_12px_32px_4px_rgba(0,0,0,0.2),0px_8px_20px_rgba(0,0,0,0.3)] focus-within:shadow-[0px_12px_32px_4px_rgba(0,0,0,0.04),0px_8px_20px_rgba(0,0,0,0.08),0_0_0_2px_rgba(var(--primary),0.3)] dark:focus-within:shadow-[0px_12px_32px_4px_rgba(0,0,0,0.2),0px_8px_20px_rgba(0,0,0,0.3),0_0_0_2px_rgba(var(--primary),0.3)] transition-shadow ${className ?? ""}`}
    >
      {leading}
      <textarea
        ref={setRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={placeholder}
        rows={1}
        className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-[120px]"
      />
      {isGenerating && onStop && !allowSubmitWhileGenerating ? (
        <button
          onClick={onStop}
          className="w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-all flex-shrink-0"
        >
          <StopCircle className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handleSendClick}
          disabled={!value.trim() || !canSubmit}
          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
      {trailing}
    </SquircleContainer>
  );
}
