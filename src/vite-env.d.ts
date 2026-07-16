/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk publishable key — omit entirely for local-only / self-hosted installs. */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  /** Remote API origin. Defaults to same-origin ("" → /api/...). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
