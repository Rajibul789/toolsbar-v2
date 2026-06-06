export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-abyss">
      <div className="flex flex-col items-center gap-6">
        {/* Spinning ring */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full ring-spin opacity-20" />
          <div
            className="absolute inset-1 rounded-full border-t-2 animate-spin"
            style={{ borderColor: "var(--neon-cyan) transparent transparent transparent" }}
          />
          <div
            className="absolute inset-3 rounded-full border-b animate-spin"
            style={{
              borderColor: "transparent transparent var(--neon-purple) transparent",
              animationDuration: "1.5s",
              animationDirection: "reverse",
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 20px rgba(0,245,255,0.15)" }}
          />
        </div>

        {/* Status text */}
        <div className="text-center space-y-1">
          <p className="text-xs font-mono text-neon-cyan tracking-widest uppercase">
            LOADING
          </p>
          <p className="text-[10px] font-mono text-text-muted">
            Initializing system...
          </p>
        </div>
      </div>
    </div>
  );
}
