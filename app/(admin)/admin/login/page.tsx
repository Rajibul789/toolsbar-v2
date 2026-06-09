"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Eye, EyeOff, Lock, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Authentication failed");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "var(--abyss)",
        backgroundImage: "linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(0,245,255,0.1)",
                border: "1px solid rgba(0,245,255,0.3)",
                boxShadow: "0 0 20px rgba(0,245,255,0.15)",
              }}
            >
              <Zap className="w-5 h-5 text-neon-cyan" />
            </div>
            <span className="font-display text-xl font-black text-white tracking-widest">TOOLSBAR</span>
          </div>
          <p className="text-xs font-mono text-text-muted tracking-widest uppercase">
            Admin Control Panel · Restricted Access
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 relative"
          style={{
            background: "rgba(10,15,30,0.9)",
            border: "1px solid rgba(0,245,255,0.12)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Corner brackets */}
          <div className="corner-bracket tl" />
          <div className="corner-bracket tr" />
          <div className="corner-bracket bl" />
          <div className="corner-bracket br" />

          {/* Terminal header */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-neon-cyan/8">
            <div className="w-2 h-2 rounded-full bg-neon-red" />
            <div className="w-2 h-2 rounded-full bg-neon-yellow" />
            <div className="w-2 h-2 rounded-full bg-neon-green" />
            <span className="text-xs font-mono text-text-muted ml-2 tracking-wider">
              AUTHENTICATE · SESSION v2
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <input
                  {...register("email")}
                  type="email"
                  placeholder="movieburststeam@gmail.com"
                  className="input-cyber w-full pl-10"
                  autoComplete="email"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              </div>
              {errors.email && (
                <p className="text-xs font-mono text-neon-red flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="input-cyber w-full pl-10 pr-10"
                  autoComplete="current-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-neon-cyan transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-mono text-neon-red flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg px-4 py-3 flex items-center gap-2"
                style={{
                  background: "rgba(255,0,60,0.06)",
                  border: "1px solid rgba(255,0,60,0.2)",
                }}
              >
                <AlertCircle className="w-4 h-4 text-neon-red flex-shrink-0" />
                <p className="text-xs font-mono text-neon-red">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-neon py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  ACCESS SYSTEM
                </>
              )}
            </button>
          </form>

          {/* Warning */}
          <p className="text-center text-[11px] font-mono text-text-muted mt-5 leading-relaxed">
            Unauthorized access is monitored and logged.
            <br />
            This system is for authorized personnel only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
