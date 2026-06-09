"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface TypeWriterProps {
  texts: string[];
  speed?: number;
  deleteSpeed?: number;
  pauseTime?: number;
  className?: string;
  cursor?: boolean;
  loop?: boolean;
}

export function TypeWriter({
  texts,
  speed = 60,
  deleteSpeed = 30,
  pauseTime = 2000,
  className,
  cursor = true,
  loop = true,
}: TypeWriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentText = texts[textIndex];

    if (isPaused) {
      timeoutRef.current = setTimeout(() => {
        setIsPaused(false);
        if (loop || textIndex < texts.length - 1) {
          setIsDeleting(true);
        }
      }, pauseTime);
      return;
    }

    if (!isDeleting) {
      if (displayText === currentText) {
        setIsPaused(true);
        return;
      }
      timeoutRef.current = setTimeout(() => {
        setDisplayText(currentText.slice(0, displayText.length + 1));
      }, speed + Math.random() * 30);
    } else {
      if (displayText === "") {
        setIsDeleting(false);
        setTextIndex((prev) => (prev + 1) % texts.length);
        return;
      }
      timeoutRef.current = setTimeout(() => {
        setDisplayText(displayText.slice(0, -1));
      }, deleteSpeed);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [displayText, isDeleting, textIndex, isPaused, texts, speed, deleteSpeed, pauseTime, loop]);

  return (
    <span className={cn("inline-block", className)}>
      {displayText}
      {cursor && (
        <span
          className="inline-block w-[2px] h-[1em] ml-1 align-text-bottom animate-blink"
          style={{ background: "var(--neon-cyan)" }}
        />
      )}
    </span>
  );
}
