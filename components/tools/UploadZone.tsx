"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, File } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { NeonColor } from "@/config/tools.config";
import { NEON_COLOR_MAP } from "@/config/tools.config";

interface UploadZoneProps {
  onDrop: (files: File[]) => void;
  accept?: Accept;
  maxFiles?: number;
  maxSizeMb?: number;
  currentFiles?: File[];
  onRemoveFile?: (index: number) => void;
  accentColor?: NeonColor;
  label?: ReactNode;
  sublabel?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export function UploadZone({
  onDrop,
  accept,
  maxFiles = 1,
  maxSizeMb = 50,
  currentFiles = [],
  onRemoveFile,
  accentColor = "cyan",
  label,
  sublabel,
  disabled = false,
  multiple = false,
}: UploadZoneProps) {
  const neonColor = NEON_COLOR_MAP[accentColor];

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      onDrop(acceptedFiles);
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: handleDrop,
    accept,
    maxFiles: multiple ? maxFiles : 1,
    maxSize: maxSizeMb * 1024 * 1024,
    disabled,
    multiple,
  });

  const hasFiles = currentFiles.length > 0;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "upload-zone relative cursor-pointer select-none",
          isDragActive && "drag-over",
          disabled && "opacity-50 cursor-not-allowed",
          hasFiles && "border-opacity-80"
        )}
        style={
          isDragActive
            ? {
                borderColor: neonColor,
                background: `${neonColor}06`,
                boxShadow: `0 0 40px ${neonColor}15`,
              }
            : undefined
        }
      >
        <input {...getInputProps()} />

        {/* Corner brackets */}
        <div className="corner-bracket tl" style={{ borderColor: `${neonColor}40` }} />
        <div className="corner-bracket tr" style={{ borderColor: `${neonColor}40` }} />
        <div className="corner-bracket bl" style={{ borderColor: `${neonColor}40` }} />
        <div className="corner-bracket br" style={{ borderColor: `${neonColor}40` }} />

        <AnimatePresence mode="wait">
          {isDragActive ? (
            <motion.div
              key="drag"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Upload className="w-10 h-10" style={{ color: neonColor }} />
              </motion.div>
              <p className="font-mono text-sm font-semibold" style={{ color: neonColor }}>
                DROP TO UPLOAD
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-4"
            >
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{
                  background: `${neonColor}08`,
                  border: `1px dashed ${neonColor}30`,
                }}
              >
                <Upload className="w-7 h-7" style={{ color: `${neonColor}80` }} />
              </div>
              <div className="text-center">
                <p className="font-mono text-sm text-text-primary mb-1">
                  {label ?? (
                    <>
                      <span style={{ color: neonColor }}>Click to upload</span> or drag & drop
                    </>
                  )}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  {sublabel ??
                    `${accept ? Object.values(accept).flat().join(", ").toUpperCase() : "Any file"} · Max ${maxSizeMb}MB${
                      multiple ? ` · Up to ${maxFiles} files` : ""
                    }`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* File rejections */}
      <AnimatePresence>
        {fileRejections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg px-4 py-3"
            style={{
              background: "rgba(255,0,60,0.06)",
              border: "1px solid rgba(255,0,60,0.2)",
            }}
          >
            {fileRejections.map(({ file, errors }) => (
              <p key={file.name} className="text-xs font-mono text-neon-red">
                {file.name}: {errors.map((e) => e.message).join(", ")}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File list */}
      <AnimatePresence>
        {hasFiles && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {currentFiles.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-lg px-4 py-2.5"
                style={{
                  background: `${neonColor}06`,
                  border: `1px solid ${neonColor}20`,
                }}
              >
                <File className="w-4 h-4 flex-shrink-0" style={{ color: neonColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-text-primary truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] font-mono text-text-muted">
                    {formatBytes(file.size)}
                  </p>
                </div>
                {onRemoveFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(i);
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-neon-red transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}