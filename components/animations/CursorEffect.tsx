"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CursorEffect() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Main cursor — snappy
  const springConfig = { damping: 25, stiffness: 700, mass: 0.5 };
  const dotX = useSpring(cursorX, springConfig);
  const dotY = useSpring(cursorY, springConfig);

  // Trailing ring — laggier
  const trailConfig = { damping: 30, stiffness: 200, mass: 0.8 };
  const ringX = useSpring(cursorX, trailConfig);
  const ringY = useSpring(cursorY, trailConfig);

  useEffect(() => {
    // Only on non-touch devices
    if ("ontouchstart" in window) return;

    function onMove(e: MouseEvent) {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement;
      const cursor = getComputedStyle(target).cursor;
      setIsPointer(cursor === "pointer" || target.tagName === "A" || target.tagName === "BUTTON");
    }

    function onEnter() { setIsVisible(true); }
    function onLeave() { setIsVisible(false); }
    function onDown() { setIsClicking(true); }
    function onUp() { setIsClicking(false); }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);

    // Hide default cursor
    document.documentElement.style.cursor = "none";

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.documentElement.style.cursor = "";
    };
  }, [cursorX, cursorY, isVisible]);

  if (typeof window !== "undefined" && "ontouchstart" in window) return null;

  return (
    <>
      {/* Dot — main cursor */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99999]"
        style={{ x: dotX, y: dotY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isClicking ? 0.6 : 1,
        }}
        transition={{ duration: 0.15 }}
      >
        <div
          className="rounded-full transition-all duration-150"
          style={{
            width: isPointer ? 8 : 6,
            height: isPointer ? 8 : 6,
            background: isPointer ? "var(--neon-cyan)" : "rgba(0,245,255,0.9)",
            boxShadow: isPointer
              ? "0 0 12px rgba(0,245,255,0.9), 0 0 24px rgba(0,245,255,0.4)"
              : "0 0 6px rgba(0,245,255,0.6)",
          }}
        />
      </motion.div>

      {/* Ring — trailing cursor */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99998] rounded-full border"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          borderColor: isPointer ? "rgba(0,245,255,0.7)" : "rgba(0,245,255,0.25)",
          boxShadow: isPointer ? "0 0 15px rgba(0,245,255,0.3)" : "none",
        }}
        animate={{
          opacity: isVisible ? 1 : 0,
          width: isPointer ? 40 : isClicking ? 20 : 32,
          height: isPointer ? 40 : isClicking ? 20 : 32,
        }}
        transition={{ duration: 0.2 }}
      />
    </>
  );
}