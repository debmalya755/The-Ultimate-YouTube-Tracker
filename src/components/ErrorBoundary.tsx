import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Without this, any render-time throw unmounts the whole tree and leaves a
 * blank page — with no hint that the user's logged hours are still safely in
 * localStorage. This keeps the failure visible and recoverable.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Tracker crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-carbon px-6 py-16 text-bone">
        <div className="w-full max-w-lg">
          <p className="flex items-center gap-3 font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blood" />
            Core fault
          </p>
          <h1 className="mt-5 font-display text-[clamp(2rem,7vw,3.5rem)] uppercase leading-[0.95]">
            Something broke
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-smoke">
            The interface hit an unexpected error. Your profiles, channels, playlists and
            logged hours are stored locally and have not been touched.
          </p>

          <pre className="mt-6 max-h-40 overflow-auto border border-bone/15 bg-black/40 p-4 font-mono text-[10px] leading-relaxed text-bone/50">
            {error.message || String(error)}
          </pre>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-full bg-bone px-7 py-3 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase transition-colors duration-300 hover:bg-blood hover:text-bone"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full border border-bone/25 px-7 py-3 font-mono text-[9px] tracking-[0.3em] text-bone/70 uppercase transition-colors duration-300 hover:border-bone/60 hover:text-bone"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
