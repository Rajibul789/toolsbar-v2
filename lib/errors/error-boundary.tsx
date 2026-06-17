"use client";

/**
 * lib/errors/error-boundary.tsx
 *
 * React class-based Error Boundary — Part 5 update.
 * Added automatic logging to /api/errors/log in componentDidCatch.
 *
 * Catches:
 *   ✔ React render errors
 *   ✔ Lifecycle method errors
 *   ✔ Constructor errors in child components
 *   ✔ componentStack (the React component tree at point of failure)
 *
 * Does NOT catch:
 *   ✗ Event handler errors (use try/catch inside handlers)
 *   ✗ Async errors (use try/catch + state)
 *   ✗ Server component errors (handled by Next.js error.tsx)
 *   ✗ Errors thrown in the boundary itself
 */

import React from "react";
import { ErrorPanel, type ErrorPanelProps } from "./error-panel";

// ─── Auto-log helper ──────────────────────────────────────────────────────────

function autoLogError(
  error: Error,
  componentStack: string,
  route: string
): void {
  // Fire-and-forget — never let logging crash the boundary
  try {
    fetch("/api/errors/log", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorType:     error.name     || "ReactBoundaryError",
        message:       error.message  || "React boundary caught an error",
        stackTrace:    error.stack    ?? null,
        componentName: extractTopComponent(componentStack),
        route,
        browser: getBrowser(),
        device:  getDevice(),
      }),
    }).catch(() => {/* swallow network errors */});
  } catch {
    // never throw from here
  }
}

function extractTopComponent(componentStack: string): string | null {
  if (!componentStack) return null;
  const match = componentStack.match(/^\s*at\s+(\w+)/m);
  return match?.[1] ?? null;
}

function getBrowser(): string {
  if (typeof navigator === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/"))    return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Edg/"))        return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Chrome/"))     return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ""}`;
  if (ua.includes("Safari/") && !ua.includes("Chrome"))
    return `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ""}`;
  return ua.slice(0, 80);
}

function getDevice(): string {
  if (typeof navigator === "undefined") return "Server";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua))    return "Android";
  if (/iPhone/i.test(ua))     return "iPhone";
  if (/iPad/i.test(ua))       return "iPad";
  if (/Macintosh/i.test(ua))  return "macOS";
  if (/Windows/i.test(ua))    return "Windows";
  if (/Linux/i.test(ua))      return "Linux";
  return navigator.platform ?? "Unknown";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FallbackComponent = React.ComponentType<
  Omit<ErrorPanelProps, "route" | "userId" | "userRole">
>;

interface ErrorBoundaryProps {
  children:  React.ReactNode;
  fallback?: FallbackComponent;
  onError?:  (error: Error, componentStack: string) => void;
}

interface ErrorBoundaryState {
  hasError:       boolean;
  error:          Error | null;
  componentStack: string | null;
}

// ─── Error Boundary Class ─────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const componentStack = info.componentStack ?? null;
    this.setState({ componentStack });

    // Always log to browser console
    console.error("[ErrorBoundary] Caught render error:", error);
    if (componentStack) {
      console.error("[ErrorBoundary] Component stack:", componentStack);
    }

    // Part 5: Auto-log to ErrorLog table via /api/errors/log
    const route = typeof window !== "undefined"
      ? window.location.pathname
      : "unknown";
    autoLogError(error, componentStack ?? "", route);

    // Custom handler (optional)
    if (this.props.onError) {
      this.props.onError(error, componentStack ?? "");
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  render(): React.ReactNode {
    const { hasError, error, componentStack } = this.state;

    if (hasError && error) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error as Error & { digest?: string }}
            reset={this.reset}
            componentStack={componentStack}
          />
        );
      }
      return (
        <ErrorPanel
          error={error as Error & { digest?: string }}
          reset={this.reset}
          componentStack={componentStack}
        />
      );
    }

    return this.props.children;
  }
}

// ─── HOC ─────────────────────────────────────────────────────────────────────

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: FallbackComponent;
    onError?:  (error: Error, stack: string) => void;
  }
): React.ComponentType<P> {
  const Wrapped = (props: P) => (
    <ErrorBoundary fallback={options?.fallback} onError={options?.onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${
    Component.displayName ?? Component.name ?? "Component"
  })`;
  return Wrapped;
}