import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useAuthStore } from "@/features/auth/stores";

const API_URL = import.meta.env.VITE_API_URL as string;

export default function AuthBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const setSubscriptionStatus = useAuthStore((s) => s.setSubscriptionStatus);

  useEffect(() => {
    setAuthState({
      clerkUserId: user?.id ?? null,
      isSignedIn: isSignedIn ?? false,
      isLoaded,
    });
  }, [isLoaded, isSignedIn, user?.id, setAuthState]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setSubscriptionStatus("none");
      return;
    }
    void (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/subscription/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setSubscriptionStatus("none");
          return;
        }
        const data = await res.json();
        setSubscriptionStatus(data.status, data.period_end ?? null);
      } catch {
        setSubscriptionStatus("none");
      }
    })();
  }, [isLoaded, isSignedIn, getToken, setSubscriptionStatus]);

  return null;
}
