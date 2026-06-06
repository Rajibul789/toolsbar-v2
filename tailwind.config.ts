import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        void:     "#000308",
        abyss:    "#010610",
        terminal: "#0a0f1e",
        surface:  "#0d1224",
        panel:    "#111827",

        // Neon accent system
        neon: {
          cyan:       "#00f5ff",
          "cyan-dim": "#00b8d4",
          green:      "#00ff88",
          "green-dim":"#00cc6a",
          purple:     "#bf00ff",
          "purple-dim":"#8b00d4",
          red:        "#ff003c",
          "red-dim":  "#cc0030",
          orange:     "#ff6600",
          yellow:     "#ffcc00",
          pink:       "#ff00aa",
          blue:       "#0066ff",
        },

        // Shadcn/Radix compatible token overrides
        border:      "rgba(0, 245, 255, 0.12)",
        input:       "rgba(0, 245, 255, 0.08)",
        ring:        "#00f5ff",
        background:  "#010610",
        foreground:  "#e2e8f0",
        primary: {
          DEFAULT:    "#00f5ff",
          foreground: "#000308",
        },
        secondary: {
          DEFAULT:    "#0d1224",
          foreground: "#94a3b8",
        },
        destructive: {
          DEFAULT:    "#ff003c",
          foreground: "#fef2f2",
        },
        muted: {
          DEFAULT:    "#0a0f1e",
          foreground: "#475569",
        },
        accent: {
          DEFAULT:    "#0d1224",
          foreground: "#00f5ff",
        },
        popover: {
          DEFAULT:    "#0a0f1e",
          foreground: "#e2e8f0",
        },
        card: {
          DEFAULT:    "#0a0f1e",
          foreground: "#e2e8f0",
        },
      },

      fontFamily: {
        display: ["var(--font-orbitron)", "monospace"],
        mono:    ["var(--font-jetbrains)", "monospace"],
        body:    ["var(--font-inter)", "sans-serif"],
        sans:    ["var(--font-inter)", "sans-serif"],
      },

      boxShadow: {
        "neon-cyan":   "0 0 20px rgba(0,245,255,0.4), 0 0 60px rgba(0,245,255,0.15)",
        "neon-green":  "0 0 20px rgba(0,255,136,0.4), 0 0 60px rgba(0,255,136,0.15)",
        "neon-purple": "0 0 20px rgba(191,0,255,0.4), 0 0 60px rgba(191,0,255,0.15)",
        "neon-red":    "0 0 20px rgba(255,0,60,0.4), 0 0 60px rgba(255,0,60,0.15)",
        "neon-orange": "0 0 20px rgba(255,102,0,0.4), 0 0 60px rgba(255,102,0,0.15)",
        "glass":       "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glass-hover": "0 8px 32px rgba(0,0,0,0.6), 0 0 40px rgba(0,245,255,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card":        "0 0 0 1px rgba(0,245,255,0.08), 0 4px 24px rgba(0,0,0,0.5)",
        "card-hover":  "0 0 0 1px rgba(0,245,255,0.3), 0 4px 24px rgba(0,0,0,0.5), 0 0 40px rgba(0,245,255,0.12)",
      },

      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },

      backdropBlur: {
        glass: "16px",
      },

      backgroundImage: {
        "cyber-gradient":
          "linear-gradient(135deg, rgba(0,245,255,0.05) 0%, rgba(191,0,255,0.05) 100%)",
        "hero-gradient":
          "radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(191,0,255,0.08) 0%, transparent 50%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(10,15,30,0.9) 0%, rgba(13,18,36,0.9) 100%)",
        "scan-gradient":
          "linear-gradient(180deg, transparent 0%, rgba(0,245,255,0.08) 50%, transparent 100%)",
        "grid-lines":
          "linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)",
      },

      backgroundSize: {
        grid: "60px 60px",
      },

      keyframes: {
        // Matrix rain (CSS fallback / overlay shimmer)
        "matrix-flow": {
          "0%":   { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "0% 100%" },
        },
        // Scan line drift
        "scan-drift": {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        // Neon pulse
        "pulse-neon-cyan": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(0,245,255,0.3), 0 0 30px rgba(0,245,255,0.1)" },
          "50%":       { boxShadow: "0 0 25px rgba(0,245,255,0.6), 0 0 60px rgba(0,245,255,0.25)" },
        },
        "pulse-neon-green": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(0,255,136,0.3), 0 0 30px rgba(0,255,136,0.1)" },
          "50%":       { boxShadow: "0 0 25px rgba(0,255,136,0.6), 0 0 60px rgba(0,255,136,0.25)" },
        },
        // Glitch
        "glitch-top": {
          "0%, 100%":  { clipPath: "polygon(0 0, 100% 0, 100% 35%, 0 35%)", transform: "translate(0)" },
          "25%":        { transform: "translate(-4px, 2px)" },
          "50%":        { transform: "translate(3px, -1px)" },
          "75%":        { transform: "translate(-2px, 3px)" },
        },
        "glitch-bottom": {
          "0%, 100%":  { clipPath: "polygon(0 65%, 100% 65%, 100% 100%, 0 100%)", transform: "translate(0)" },
          "25%":        { transform: "translate(3px, -2px)" },
          "50%":        { transform: "translate(-4px, 1px)" },
          "75%":        { transform: "translate(2px, -3px)" },
        },
        // Blink cursor
        "blink": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0" },
        },
        // Float
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-8px)" },
        },
        // Slide in from bottom
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Data decode (for result reveal)
        "decode": {
          "0%":   { filter: "blur(4px)", opacity: "0.2" },
          "100%": { filter: "blur(0)", opacity: "1" },
        },
        // Scanner sweep
        "scan-sweep": {
          "0%":   { top: "-10%", opacity: "0" },
          "10%":  { opacity: "1" },
          "90%":  { opacity: "1" },
          "100%": { top: "110%", opacity: "0" },
        },
        // Appear
        "appear": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Border glow spin
        "border-spin": {
          "100%": { transform: "rotate(360deg)" },
        },
        // Shimmer
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },

      animation: {
        "pulse-neon-cyan":  "pulse-neon-cyan 2.5s ease-in-out infinite",
        "pulse-neon-green": "pulse-neon-green 2.5s ease-in-out infinite",
        "scan-drift":       "scan-drift 6s linear infinite",
        "blink":            "blink 1s step-end infinite",
        "float":            "float 6s ease-in-out infinite",
        "slide-up":         "slide-up 0.5s ease-out",
        "decode":           "decode 0.8s ease-out forwards",
        "scan-sweep":       "scan-sweep 2s ease-in-out",
        "appear":           "appear 0.4s ease-out",
        "glitch-top":       "glitch-top 3s infinite",
        "glitch-bottom":    "glitch-bottom 3s infinite",
        "border-spin":      "border-spin 4s linear infinite",
        "shimmer":          "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
