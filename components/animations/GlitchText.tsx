"use client";

import { cn } from "@/lib/utils";

interface GlitchTextProps {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "span" | "p";
  active?: boolean;
}

export function GlitchText({
  children,
  className,
  as: Tag = "span",
  active = true,
}: GlitchTextProps) {
  return (
    <Tag
      data-text={children}
      className={cn(active ? "glitch" : "", "relative", className)}
    >
      {children}
    </Tag>
  );
}
