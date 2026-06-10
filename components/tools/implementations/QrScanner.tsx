"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Copy, ExternalLink, X, CheckCircle2 } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { toast } from "sonner";

type ScanMode  = "camera" | "upload";
type ScanState = "idle" | "scanning" | "result" | "error";

const CAMERA_DIV_ID = "qr-camera-reader";
const IMAGE_DIV_ID  = "qr-image-reader";

export function QrScanner() {
  const [mode,      setMode]      = useState<ScanMode>("upload");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result,    setResult]    = useState<string>("");
  const [cameraRunning, setCameraRunning] = useState(false);

  // Keep scanner ref so we can stop it
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // ── Start camera scanner ────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setScanState("scanning");
    setCameraRunning(true);
    // Wait a tick for the camera div to mount in the DOM
    await new Promise((r) => setTimeout(r, 120));

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Verify the div exists before creating scanner
      const div = document.getElementById(CAMERA_DIV_ID);
      if (!div) {
        throw new Error("Camera container not found in DOM");
      }

      const scanner = new Html5Qrcode(CAMERA_DIV_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          setCameraRunning(false);
          setResult(decoded);
          setScanState("result");
        },
        () => {} // frame error — silent (QR not detected yet)
      );
    } catch (err: unknown) {
      setCameraRunning(false);
      setScanState("error");
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
        toast.error("Camera permission denied. Use image upload mode instead.");
      } else {
        toast.error("Could not start camera. Try uploading a QR image.");
      }
      console.error("[QrScanner] camera error:", err);
    }
  }, []);

  async function stopCamera() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setCameraRunning(false);
    setScanState("idle");
  }

  // ── Scan from uploaded image ────────────────────────────────────
  async function scanFromImage(files: File[]) {
    const file = files[0];
    if (!file) return;
    setScanState("scanning");

    // The hidden div for image scanning must also exist
    await new Promise((r) => setTimeout(r, 50));

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const div = document.getElementById(IMAGE_DIV_ID);
      if (!div) throw new Error("Image reader container not found");

      const scanner = new Html5Qrcode(IMAGE_DIV_ID);

      // html5-qrcode scanFile expects a File object
      const decoded = await scanner.scanFile(file, /* showImage */ false);
      setResult(decoded);
      setScanState("result");
    } catch (err) {
      console.error("[QrScanner] image scan error:", err);
      setScanState("error");
      toast.error("No QR code detected. Try a clearer, well-lit image.");
    }
  }

  function handleReset() {
    stopCamera();
    setResult("");
    setScanState("idle");
  }

  function copyResult() {
    navigator.clipboard.writeText(result).then(() => toast.success("Copied!"));
  }

  const isUrl    = result.startsWith("http://") || result.startsWith("https://");
  const isCamera = mode === "camera";

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div>
        <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">
          Scan Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: "upload" as ScanMode, icon: Upload, label: "Upload QR Image", desc: "Scan from a file" },
            { id: "camera" as ScanMode, icon: Camera, label: "Use Camera",      desc: "Live scan from camera" },
          ] as const).map(({ id, icon: Icon, label, desc }) => (
            <button key={id}
              onClick={() => { handleReset(); setMode(id); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left"
              style={{
                background: mode === id ? "rgba(0,255,136,0.08)" : "rgba(0,255,136,0.02)",
                borderColor: mode === id ? "rgba(0,255,136,0.4)" : "rgba(0,255,136,0.1)",
              }}>
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: mode === id ? "#00ff88" : "#475569" }} />
              <div>
                <p className="text-xs font-mono font-semibold" style={{ color: mode === id ? "#00ff88" : "#e2e8f0" }}>{label}</p>
                <p className="text-[10px] font-mono text-text-muted">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/*
        IMPORTANT: Both scanner divs are ALWAYS in the DOM.
        html5-qrcode requires the element to exist before
        Html5Qrcode(id) is called. We show/hide via CSS only.
      */}
      <div id={CAMERA_DIV_ID} className="w-full rounded-xl overflow-hidden"
        style={{ display: (isCamera && cameraRunning) ? "block" : "none", minHeight: 280,
          border: "1px solid rgba(0,255,136,0.2)" }} />
      <div id={IMAGE_DIV_ID} style={{ display: "none" }} />

      <AnimatePresence mode="wait">
        {/* ── IDLE UPLOAD ── */}
        {!isCamera && scanState === "idle" && (
          <motion.div key="upload-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UploadZone
              onDrop={scanFromImage}
              accept={{ "image/jpeg": [], "image/png": [], "image/webp": [], "image/gif": [] }}
              accentColor="green"
              maxSizeMb={5}
              label={<>Upload an image <span className="text-neon-green">containing a QR code</span></>}
              sublabel="JPG, PNG, WebP, GIF · Max 5MB"
            />
          </motion.div>
        )}

        {/* ── IDLE CAMERA ── */}
        {isCamera && scanState === "idle" && (
          <motion.div key="camera-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={startCamera}
              className="w-full btn-neon-green py-4 flex items-center justify-center gap-2 font-mono font-bold tracking-widest">
              <Camera className="w-5 h-5" />START CAMERA SCANNER
            </button>
            <p className="text-center text-xs font-mono text-text-muted mt-3">
              Camera permission will be requested by your browser
            </p>
          </motion.div>
        )}

        {/* ── SCANNING (camera active overlay) ── */}
        {isCamera && cameraRunning && scanState === "scanning" && (
          <motion.div key="camera-active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Corner scan brackets overlay */}
            <div className="relative" style={{ minHeight: 280 }}>
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52">
                  {[{ cls: "tl" }, { cls: "tr" }, { cls: "bl" }, { cls: "br" }].map(({ cls }) => (
                    <div key={cls} className={`corner-bracket ${cls}`}
                      style={{ borderColor: "rgba(0,255,136,0.9)", width: 20, height: 20 }} />
                  ))}
                  <motion.div className="absolute left-0 right-0 h-0.5"
                    style={{ background: "rgba(0,255,136,0.8)", boxShadow: "0 0 8px rgba(0,255,136,0.6)" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                </div>
              </div>
            </div>
            <button onClick={stopCamera}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-mono transition-all"
              style={{ borderColor: "rgba(255,0,60,0.25)", color: "#ff003c" }}>
              <X className="w-4 h-4" />Stop Camera
            </button>
          </motion.div>
        )}

        {/* ── SCANNING IMAGE ── */}
        {scanState === "scanning" && !cameraRunning && (
          <motion.div key="image-scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <motion.div className="w-16 h-16 mx-auto border-2 border-neon-green border-t-transparent rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              <p className="text-sm font-mono text-neon-green">SCANNING FOR QR CODE...</p>
            </div>
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {scanState === "result" && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="space-y-4">
              <div className="rounded-xl p-5"
                style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.25)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  <span className="text-xs font-mono font-semibold text-neon-green tracking-wider">QR CODE DECODED</span>
                </div>
                <div className="rounded-lg p-4 mb-4"
                  style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,255,136,0.15)" }}>
                  <p className="text-sm font-mono break-all" style={{ color: isUrl ? "#00f5ff" : "#e2e8f0" }}>
                    {result}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={copyResult}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-mono transition-all"
                    style={{ borderColor: "rgba(0,245,255,0.3)", color: "#00f5ff", background: "rgba(0,245,255,0.06)" }}>
                    <Copy className="w-3.5 h-3.5" />Copy
                  </button>
                  {isUrl && (
                    <a href={result} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-mono transition-all"
                      style={{ borderColor: "rgba(0,255,136,0.3)", color: "#00ff88", background: "rgba(0,255,136,0.06)" }}>
                      <ExternalLink className="w-3.5 h-3.5" />Open URL
                    </a>
                  )}
                  <button onClick={handleReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-mono border-white/10 text-text-muted hover:text-text-primary transition-all">
                    Scan Another
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {scanState === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center"
              style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">NO QR CODE DETECTED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}