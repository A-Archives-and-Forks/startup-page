import { useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { HiOutlineUser, HiOutlineCloud, HiOutlineComputerDesktop } from "react-icons/hi2";
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

function formatSyncTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Small colored dot overlaid on the account button showing sync state. */
function StatusDot({ color, title }: { color: string; title: string }) {
  return (
    <span
      title={title}
      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${color}`}
    />
  );
}

export default function AccountButton() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { openSignIn, signOut } = useClerk();
  const subscriptionStatus = useAuthStore((s) => s.subscriptionStatus);
  const syncStatus = useAuthStore((s) => s.syncStatus);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const hasSyncAccess = useAuthStore((s) => s.hasSyncAccess);
  const [accountOpen, setAccountOpen] = useState(false);
  const [localInfoOpen, setLocalInfoOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!isLoaded) return null;

  // ── Signed out: explain local mode, offer sign-in ──────────────────────────
  if (!isSignedIn) {
    return (
      <Dialog open={localInfoOpen} onOpenChange={setLocalInfoOpen}>
        <button
          type="button"
          className="relative cursor-pointer text-2xl"
          onClick={() => setLocalInfoOpen(true)}
          title="Local mode — settings stored in this browser. Click for details."
        >
          <HiOutlineUser />
          <StatusDot color="bg-zinc-400" title="Local mode" />
        </button>
        <DialogContent className="w-[min(92vw,420px)] border-border/60 bg-background/98 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <HiOutlineComputerDesktop className="text-xl" />
              You&apos;re in local mode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground/80">
              Your settings, bookmarks, and themes are stored <strong>in this browser only</strong>{" "}
              (IndexedDB with a localStorage mirror). They won&apos;t follow you to other devices,
              and clearing browser data will remove them — you can export a backup from Settings.
            </p>
            <Button className="w-full" onClick={() => openSignIn()}>
              Sign in to enable cloud sync
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Signed in ───────────────────────────────────────────────────────────────
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "";
  const synced = hasSyncAccess();
  const dotColor = !synced
    ? "bg-zinc-400"
    : syncStatus === "error"
      ? "bg-red-500"
      : "bg-emerald-400";
  const dotTitle = !synced
    ? "Signed in — local storage only"
    : syncStatus === "error"
      ? "Cloud sync error — using local data"
      : "Cloud sync active";
  const syncTime = formatSyncTime(lastSyncedAt);

  return (
    <>
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <button
          type="button"
          className="relative cursor-pointer"
          onClick={() => setAccountOpen(true)}
          title={`Signed in as ${email} — ${dotTitle}`}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Account"
              className="h-7 w-7 rounded-full object-cover ring-1 ring-foreground/30"
            />
          ) : (
            <span className="text-2xl">
              <HiOutlineUser />
            </span>
          )}
          <StatusDot color={dotColor} title={dotTitle} />
        </button>
        <DialogContent className="w-[min(92vw,420px)] border-border/60 bg-background/98 p-6">
          <DialogHeader>
            <DialogTitle className="pr-8">Your Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {user?.imageUrl && (
                <img src={user.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{user?.fullName || email}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>

            <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                {synced ? <HiOutlineCloud className="text-base" /> : <HiOutlineComputerDesktop className="text-base" />}
                Data source
              </p>
              {synced ? (
                <>
                  <p className="mt-1 font-medium">
                    Cloud sync
                    <span className={`ml-2 inline-block h-2 w-2 rounded-full align-middle ${dotColor}`} />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {syncStatus === "error"
                      ? "Last sync failed — changes are safe locally and will retry."
                      : `Changes save to your account and sync across devices.${syncTime ? ` Last synced ${syncTime}.` : ""}`}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 font-medium">Local storage</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You&apos;re signed in, but settings are stored in this browser only.
                  </p>
                </>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Plan: {STATUS_LABEL[subscriptionStatus] ?? subscriptionStatus}
                {subscriptionStatus === "past_due" && (
                  <span className="text-red-500"> — payment failed, update your card to keep syncing</span>
                )}
              </p>
            </div>

            {!synced && subscriptionStatus !== "loading" && (
              <Button
                className="w-full"
                onClick={() => {
                  setAccountOpen(false);
                  setUpgradeOpen(true);
                }}
              >
                Upgrade to Cloud Sync
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
