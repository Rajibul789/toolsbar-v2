export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-10 h-10">
          <div
            className="absolute inset-0 rounded-full border-t-2 animate-spin"
            style={{ borderColor: "var(--neon-cyan) transparent transparent transparent" }}
          />
        </div>
        <p className="text-[11px] font-mono text-text-muted tracking-widest uppercase">
          Loading…
        </p>
      </div>
    </div>
  );
}
