"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Use browser devtools for details if needed.
    console.error("[dashboard-error]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-[var(--radius)] border border-red-300 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1">An unexpected error occurred. Please try again, or contact your platform administrator.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
