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
    const fontSize = 14;

    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: cols }, () => Math.random() * -50);
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    function draw() {
      if (!canvas || !ctx) return;

      // Fade trail
      ctx.fillStyle = `rgba(1, 6, 16, 0.055)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const y = drops[i] * fontSize;

        // Lead character — brightest
        const leadBrightness = Math.random() > 0.9 ? 1 : 0.85;
        if (Math.random() > 0.9) {
          ctx.fillStyle = `rgba(255, 255, 255, ${leadBrightness * opacity * 4})`;
        } else {
          ctx.fillStyle = color.replace(")", `, ${opacity * 3})`).replace("rgb", "rgba");
        }

        // Tail coloring (greenish or cyan)
        const tailColor = Math.random() > 0.5 ? color : "#00ff88";
        ctx.fillStyle = tailColor
          .replace(")", `, ${opacity * 1.5})`)
          .replace("rgb", "rgba");
        if (color.startsWith("#")) {
          // Convert hex to rgba
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 1.8})`;
        }

        ctx.fillText(char, i * fontSize, y);

        // Reset drop to top with some randomness
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5 + Math.random() * 0.5;
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
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
