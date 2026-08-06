export default function ToolsLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-12 h-12">
          <div
            className="absolute inset-0 rounded-full border-t-2 animate-spin"
            style={{ borderColor: "var(--neon-cyan) transparent transparent transparent" }}
          />
        </div>
        <p className="text-xs font-mono text-neon-cyan/70 tracking-widest uppercase">
          Loading tool…
        </p>
      </div>
    </div>
  );
}
