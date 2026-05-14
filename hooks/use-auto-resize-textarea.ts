import { useRef, useCallback, useEffect } from "react";

export function useAutoResizeTextarea(maxHeight = 120) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeRafRef = useRef<number>(0);

  const resize = useCallback(() => {
    cancelAnimationFrame(resizeRafRef.current);
    resizeRafRef.current = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    });
  }, [maxHeight]);

  useEffect(() => {
    return () => cancelAnimationFrame(resizeRafRef.current);
  }, []);

  return { textareaRef, resize };
}