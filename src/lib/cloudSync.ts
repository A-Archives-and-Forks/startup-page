import { useAuthStore } from "@/features/auth/stores";

const API_URL = import.meta.env.VITE_API_URL as string;
const PUSH_DEBOUNCE_MS = 2000;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPush: { settings: Record<string, unknown>; updatedAt: string } | null = null;

async function getToken(): Promise<string | null> {
  try {
    // Clerk JS SDK exposes the active session on window.Clerk after ClerkProvider loads.
    // Using window.Clerk avoids React hook restrictions in plain TS modules.
    const session = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk?.session;
    if (!session) return null;
    return await session.getToken();
  } catch {
    return null;
  }
}

export async function pullSettingsFromCloud(): Promise<{
  settings: Record<string, unknown>;
  serverUpdatedAt: string;
} | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404 || res.status === 402) return null;
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
    const data = await res.json();
    return { settings: data.settings, serverUpdatedAt: data.server_updated_at };
  } catch {
    // Network error: silently fall back to local
    return null;
  }
}

async function executePush(settings: Record<string, unknown>, updatedAt: string): Promise<void> {
  const token = await getToken();
  if (!token) return;

  try {
    await fetch(`${API_URL}/api/settings`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ settings, schema_version: 2, client_updated_at: updatedAt }),
    });
  } catch {
    // Fire-and-forget: local write already succeeded
  }
}

export function schedulePushToCloud(settings: Record<string, unknown>, updatedAt: string): void {
  if (!useAuthStore.getState().hasSyncAccess()) return;
  pendingPush = { settings, updatedAt };
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    if (pendingPush) {
      void executePush(pendingPush.settings, pendingPush.updatedAt);
      pendingPush = null;
    }
  }, PUSH_DEBOUNCE_MS);
}
