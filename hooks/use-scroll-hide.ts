"use client";

import { useEffect, useRef, useCallback } from "react";

export function useScrollHide(delay = 800) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("is-scrolling");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      el.classList.remove("is-scrolling");
    }, delay);
  }, [delay]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(timerRef.current);
    };
  }, [handleScroll]);

  return ref;
}
