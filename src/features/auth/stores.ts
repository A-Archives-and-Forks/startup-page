import { create } from "zustand";

export type SubscriptionStatus = "loading" | "none" | "active" | "past_due" | "canceled";

interface AuthStore {
  clerkUserId: string | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPeriodEnd: string | null;
  setAuthState: (state: { clerkUserId: string | null; isSignedIn: boolean; isLoaded: boolean }) => void;
  setSubscriptionStatus: (status: SubscriptionStatus, periodEnd?: string | null) => void;
  hasSyncAccess: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  clerkUserId: null,
  isSignedIn: false,
  isLoaded: false,
  subscriptionStatus: "loading",
  subscriptionPeriodEnd: null,

  setAuthState: (state) => set(state),

  setSubscriptionStatus: (status, periodEnd = null) =>
    set({ subscriptionStatus: status, subscriptionPeriodEnd: periodEnd }),

  hasSyncAccess: () => {
    const { isSignedIn, subscriptionStatus } = get();
    return isSignedIn && subscriptionStatus === "active";
  },
}));
