import { useAuthStore } from "@/features/auth/stores";

// Same-origin by default (Vercel serves /api next to the app).
// Self-hosters pointing at a remote API can set VITE_API_URL.
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
const PUSH_DEBOUNCE_MS = 2000;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPush: { settings: Record<string, unknown>; updatedAt: string } | null = null;
// Kept fresh on every token fetch so the pagehide flush can send synchronously
// without awaiting Clerk (Clerk session tokens live ~60s, so it's valid).
let cachedToken: string | null = null;

async function getToken(): Promise<string | null> {
  try {
    // Clerk JS SDK exposes the active session on window.Clerk after ClerkProvider loads.
    // Using window.Clerk avoids React hook restrictions in plain TS modules.
    const session = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk?.session;
    if (!session) return null;
    cachedToken = await session.getToken();
    return cachedToken;
  } catch {
    return cachedToken;
  }
}

export async function pullSettingsFromCloud(): Promise<{
  settings: Record<string, unknown>;
  serverUpdatedAt: string;
  clientUpdatedAt: string | null;
} | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) {
      // Sync works; there's just nothing in the cloud yet.
      useAuthStore.getState().setSyncStatus("synced", new Date().toISOString());
      return null;
    }
    if (res.status === 402) return null;
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
    const data = await res.json();
    useAuthStore.getState().setSyncStatus("synced", new Date().toISOString());
    return {
      settings: data.settings,
      serverUpdatedAt: data.server_updated_at,
      clientUpdatedAt: data.client_updated_at ?? null,
    };
  } catch {
    // Network error: silently fall back to local
    useAuthStore.getState().setSyncStatus("error");
    return null;
  }
}

function buildPushBody(push: { settings: Record<string, unknown>; updatedAt: string }): string {
  return JSON.stringify({
    settings: push.settings,
    schema_version: 2,
    client_updated_at: push.updatedAt,
  });
}

async function executePush(push: { settings: Record<string, unknown>; updatedAt: string }): Promise<void> {
  const token = await getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/api/settings`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: buildPushBody(push),
    });
    if (res.ok) {
      useAuthStore.getState().setSyncStatus("synced", new Date().toISOString());
    } else {
      useAuthStore.getState().setSyncStatus("error");
    }
  } catch {
    // Fire-and-forget: local write already succeeded
    useAuthStore.getState().setSyncStatus("error");
  }
}

export function schedulePushToCloud(settings: Record<string, unknown>, updatedAt: string): void {
  if (!useAuthStore.getState().hasSyncAccess()) return;
  pendingPush = { settings, updatedAt };
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    if (pendingPush) {
      void executePush(pendingPush);
      pendingPush = null;
    }
  }, PUSH_DEBOUNCE_MS);
}

/**
 * Flush a debounced push when the page is hidden or closed so edits made in
 * the last 2s aren't lost. keepalive lets the request outlive the page;
 * sendBeacon can't carry the Authorization header, so it's not usable here.
 */
function flushPendingPush(): void {
  if (!pendingPush || !cachedToken) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const body = buildPushBody(pendingPush);
  pendingPush = null;
  void fetch(`${API_URL}/api/settings`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${cachedToken}`, "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingPush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingPush();
  });
}
