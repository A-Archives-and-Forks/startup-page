import { useState } from "react";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { HiOutlineUser } from "react-icons/hi2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/stores";
import UpgradeModal from "@/features/auth/UpgradeModal";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  none: "Free",
  loading: "—",
};

export default function AccountButton() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn, signOut } = useClerk();
  const { subscriptionStatus } = useAuthStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <button
        type="button"
        className="cursor-pointer text-2xl"
        onClick={() => openSignIn()}
        title="Sign in for cloud sync"
      >
        <HiOutlineUser />
      </button>
    );
  }

  return (
    <>
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <button
          type="button"
          className="cursor-pointer text-2xl"
          onClick={() => setAccountOpen(true)}
          title="Account"
        >
          <HiOutlineUser />
        </button>
        <DialogContent className="w-[min(92vw,380px)]">
          <DialogHeader>
            <DialogTitle>Your Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-1 pb-1">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cloud sync</p>
              <p className="mt-1 font-medium">{STATUS_LABEL[subscriptionStatus] ?? subscriptionStatus}</p>
              {subscriptionStatus === "active" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Settings sync automatically across all devices.
                </p>
              )}
              {subscriptionStatus === "past_due" && (
                <p className="mt-1 text-xs text-red-500">
                  Payment failed. Update your payment method to continue syncing.
                </p>
              )}
            </div>
            {subscriptionStatus !== "active" && (
              <Button
                className="w-full"
                onClick={() => {
                  setAccountOpen(false);
                  setUpgradeOpen(true);
                }}
              >
                Upgrade to Cloud Sync — $0.99 / mo
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setAccountOpen(false);
                void signOut();
              }}
            >
              Sign out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
