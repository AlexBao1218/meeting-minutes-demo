/**
 * Local replacement for `@lark-apaas/client-toolkit`.
 *
 * The original app ran inside Feishu Spark (妙搭), whose runtime injected a
 * logger, app shell, error/404 renderers and a backend axios instance. This
 * shim provides the same import surface with plain-browser behaviour so the
 * page code can keep its original imports. Aliased in vite.config.ts.
 */
import React from "react";
import { Link } from "react-router-dom";

// ---- logger ----
const tag = "[demo]";
export const logger = {
  info: (...a: unknown[]) => console.info(tag, ...a),
  warn: (...a: unknown[]) => console.warn(tag, ...a),
  error: (...a: unknown[]) => console.error(tag, ...a),
  debug: (...a: unknown[]) => console.debug(tag, ...a),
};

// ---- app shell ----
export const AppContainer: React.FC<{
  children?: React.ReactNode;
  defaultTheme?: string;
}> = ({ children }) => <>{children}</>;

export const ErrorRender: React.FC<{
  error: unknown;
  resetErrorBoundary?: (...args: unknown[]) => void;
}> = ({ error, resetErrorBoundary }) => (
  <div className="mx-auto max-w-3xl px-5 py-16">
    <h2 className="text-lg font-semibold">Something went wrong</h2>
    <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
      {error instanceof Error ? error.message : String(error)}
    </pre>
    {resetErrorBoundary && (
      <button
        type="button"
        onClick={() => resetErrorBoundary()}
        className="mt-4 rounded-sm border border-border px-3 py-1.5 text-sm"
      >
        Retry
      </button>
    )}
  </div>
);

export const NotFoundRender: React.FC = () => (
  <div className="mx-auto max-w-3xl px-5 py-24 text-center">
    <p className="text-sm tracking-widest text-muted-foreground">404</p>
    <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
    <Link to="/" className="mt-6 inline-block text-sm underline underline-offset-4">
      Back to home
    </Link>
  </div>
);

// ---- backend axios ----
// The NestJS backend is not part of the standalone demo; the minutes API is
// implemented client-side in client/src/api/minutes. Anything else is rejected.
export const axiosForBackend = {
  post: <T,>(url: string): Promise<{ data: T }> =>
    Promise.reject(new Error(`Backend endpoint ${url} is not available in the standalone demo`)),
  get: <T,>(url: string): Promise<{ data: T }> =>
    Promise.reject(new Error(`Backend endpoint ${url} is not available in the standalone demo`)),
  delete: <T,>(url: string): Promise<{ data: T }> =>
    Promise.reject(new Error(`Backend endpoint ${url} is not available in the standalone demo`)),
};
