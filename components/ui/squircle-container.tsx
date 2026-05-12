"use client";

import { Squircle } from "corner-smoothing";

export function SquircleContainer({
  children,
  cornerRadius = 16,
  className,
  style,
}: {
  children: React.ReactNode;
  cornerRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Squircle
      cornerRadius={cornerRadius}
      cornerSmoothing={1}
      className={className}
      style={style}
    >
      {children}
    </Squircle>
  );
}