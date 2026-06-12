"use client";

/**
 * lib/errors/error-boundary.tsx
 *
 * React class-based Error Boundary.
 * React requires class components for error boundaries — hooks cannot do this.
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
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 *   // With custom fallback:
 *   <ErrorBoundary fallback={MyFallback}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */

import React from "react";
import { ErrorPanel, type ErrorPanelProps } from "./error-panel";

// ─── Types ────────────────────────────────────────────────────────────────────

type FallbackComponent = React.ComponentType<Omit<ErrorPanelProps, "route" | "userId" | "userRole">>;

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback component. Defaults to ErrorPanel. */
  fallback?: FallbackComponent;
  /** Called after an error is caught — useful for logging (Part 5) */
  onError?: (error: Error, componentStack: string) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

// ─── Error Boundary Class ─────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const componentStack = info.componentStack ?? null;
    this.setState({ componentStack });

    // Log to console in all environments so devtools always show it
    console.error("[ErrorBoundary] Caught render error:", error);
    if (componentStack) {
      console.error("[ErrorBoundary] Component stack:", componentStack);
    }

    // Part 5: logger.logError() will be called here
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

// ─── Convenience wrapper with hooks support ───────────────────────────────────

/**
 * withErrorBoundary — HOC to wrap any component with an ErrorBoundary.
 *
 * Usage:
 *   const SafeComponent = withErrorBoundary(MyComponent);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: { fallback?: FallbackComponent; onError?: (error: Error, stack: string) => void }
): React.ComponentType<P> {
  const Wrapped = (props: P) => (
    <ErrorBoundary fallback={options?.fallback} onError={options?.onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? "Component"})`;
  return Wrapped;
}