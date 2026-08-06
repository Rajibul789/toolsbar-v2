export default function MarketingLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-12 h-12">
          <div
            className="absolute inset-0 rounded-full border-t-2 animate-spin"
            style={{ borderColor: "var(--neon-purple) transparent transparent transparent" }}
          />
        </div>
        <p className="text-xs font-mono text-neon-purple/70 tracking-widest uppercase">
          Loading…
        </p>
      </div>
    </div>
  );
}
