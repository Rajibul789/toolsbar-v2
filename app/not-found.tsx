import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{
        background: "var(--abyss)",
        backgroundImage:
          "linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    >
      {/* Glitch 404 */}
      <div className="relative mb-6">
        <h1
          className="font-display text-[120px] md:text-[180px] font-black leading-none select-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "2px rgba(0,245,255,0.2)",
            textShadow:
              "0 0 40px rgba(0,245,255,0.1), 4px 4px 0 rgba(255,0,60,0.15), -4px -4px 0 rgba(0,245,255,0.15)",
          }}
        >
          404
        </h1>
        <div
          className="absolute inset-0 font-display text-[120px] md:text-[180px] font-black leading-none flex items-center justify-center"
          style={{
            color: "rgba(0,245,255,0.08)",
            animation: "glitch-top 5s infinite",
          }}
        >
          404
        </div>
      </div>

      {/* Status line */}
      <div className="badge-neon mb-4 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-red inline-block" />
        ERROR_CODE: NOT_FOUND
      </div>

      <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-3 tracking-wider">
        PAGE DOES NOT EXIST
      </h2>
      <p className="text-sm text-text-muted font-mono max-w-sm leading-relaxed mb-10">
        The resource you requested could not be located. It may have been moved, deleted, or the URL may be incorrect.
      </p>

      {/* Terminal block */}
      <div
        className="rounded-xl p-5 mb-10 text-left max-w-sm w-full"
        style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,245,255,0.1)" }}
      >
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-2 h-2 rounded-full bg-neon-red" />
          <div className="w-2 h-2 rounded-full bg-neon-yellow" />
          <div className="w-2 h-2 rounded-full bg-neon-green" />
        </div>
        <p className="text-xs font-mono">
          <span className="text-neon-cyan">$</span>{" "}
          <span className="text-text-muted">locate --path "{typeof window !== "undefined" ? window.location.pathname : "/not-found"}"</span>
          <br />
          <span className="text-neon-red">ERROR: </span>
          <span className="text-text-muted">No such file or directory</span>
          <br />
          <span className="text-neon-cyan">$</span>{" "}
          <span className="animate-blink text-neon-green">_</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/" className="btn-solid-cyan flex items-center gap-2 text-sm">
          <Home className="w-4 h-4" />
          Go Home
        </Link>
        <Link href="/tools" className="btn-neon flex items-center gap-2 text-sm">
          <Search className="w-4 h-4" />
          Browse Tools
        </Link>
      </div>
    </div>
  );
}