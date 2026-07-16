import { create } from "zustand";

export type SubscriptionStatus = "loading" | "none" | "active" | "past_due" | "canceled";

/** idle = no cloud activity yet; synced/error reflect the last pull or push. */
export type SyncStatus = "idle" | "synced" | "error";

interface AuthStore {
  clerkUserId: string | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPeriodEnd: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  setAuthState: (state: { clerkUserId: string | null; isSignedIn: boolean; isLoaded: boolean }) => void;
  setSubscriptionStatus: (status: SubscriptionStatus, periodEnd?: string | null) => void;
  setSyncStatus: (status: SyncStatus, at?: string | null) => void;
  hasSyncAccess: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  clerkUserId: null,
  isSignedIn: false,
  isLoaded: false,
  subscriptionStatus: "loading",
  subscriptionPeriodEnd: null,
  syncStatus: "idle",
  lastSyncedAt: null,

  setAuthState: (state) => set(state),

  setSubscriptionStatus: (status, periodEnd = null) =>
    set({ subscriptionStatus: status, subscriptionPeriodEnd: periodEnd }),

  setSyncStatus: (status, at = null) =>
    set((s) => ({ syncStatus: status, lastSyncedAt: at ?? s.lastSyncedAt })),

  hasSyncAccess: () => {
    const { isSignedIn, subscriptionStatus } = get();
    return isSignedIn && subscriptionStatus === "active";
  },
}));
