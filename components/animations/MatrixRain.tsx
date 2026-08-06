"use client";

import { useEffect, useRef } from "react";

interface MatrixRainProps {
  className?: string;
  opacity?: number;
  color?: string;
}

const CHARS =
  "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF<>{}[]|\\/.,:;!?@#$%^&*";

export function MatrixRain({
  className = "",
  opacity = 0.18,
  color = "#00f5ff",
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let drops: number[] = [];
    let cols = 0;
    let isPaused = false;
    const fontSize = 14;

    // ── Colour helpers ──────────────────────────────────────────
    function hexToRgba(hex: string, a: number): string {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    // Precompute every fillStyle string the draw loop can possibly use, once,
    // instead of re-parsing the same hex colour and re-building the same
    // template string for every one of ~130+ characters, every frame, at
    // 60fps. The colour choice per character is still random each frame —
    // only the string-building work is hoisted out.
    const leadStyle = `rgba(255,255,255,${opacity * 3.5})`;
    const tailStyleA = color.startsWith("#")
      ? hexToRgba(color, opacity * 1.8)
      : color.replace(")", `,${opacity * 1.8})`).replace("rgb", "rgba");
    const tailStyleB = hexToRgba("#00ff88", opacity * 1.8);
    const fontString = `${fontSize}px "JetBrains Mono", monospace`;

    // ── Resize (debounced via ResizeObserver) ────────────────────
    let resizeTimer: ReturnType<typeof setTimeout>;
    function resize() {
      if (!canvas || !ctx) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      cols  = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: cols }, () => Math.random() * -50);
      ctx.font = fontString; // canvas 2D state resets when width/height change
    }

    function debouncedResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }

    resize(); // initial — run immediately without debounce
    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(canvas);

    // ── Draw loop ────────────────────────────────────────────────
    function draw() {
      if (!canvas || !ctx) return;

      // Pause when tab is hidden (battery / CPU saving)
      if (isPaused) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      // Fade trail
      ctx.fillStyle = "rgba(1,6,16,0.055)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const y = drops[i] * fontSize;

        // Alternate lead (bright white flash) / tail (neon colour)
        if (Math.random() > 0.92) {
          ctx.fillStyle = leadStyle;
        } else {
          ctx.fillStyle = Math.random() > 0.5 ? tailStyleA : tailStyleB;
        }

        ctx.fillText(char, i * fontSize, y);

        // Reset drop to top
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5 + Math.random() * 0.5;
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();

    // ── Pause when tab hidden ────────────────────────────────────
    function onVisibilityChange() {
      isPaused = document.hidden;
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [color, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ imageRendering: "pixelated" }}
    />
  );
}