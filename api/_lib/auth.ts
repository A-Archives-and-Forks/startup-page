import { createClerkClient, verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { env } from "./env.js";
import { users, type User } from "./schema.js";
import { HttpError } from "./http.js";

export type { User };

/** Verify the Clerk bearer token and return (lazily provisioning) the matching user row. */
export async function getCurrentUser(request: Request): Promise<User> {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError(401, "Missing bearer token");
  }

  let clerkUserId: string;
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    clerkUserId = payload.sub;
  } catch {
    throw new HttpError(401, "Invalid token");
  }
  if (!clerkUserId) {
    throw new HttpError(401, "Invalid token subject");
  }

  const existing = await getDb().query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (existing) return existing;

  // Lazy provision on first authenticated request. The session token doesn't
  // carry the email, so fetch it — the comp allowlist matches on email.
  let email: string | null = null;
  try {
    const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    const clerkUser = await clerk.users.getUser(clerkUserId);
    email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null;
  } catch {
    // Provision without an email rather than failing the request.
  }

  const inserted = await getDb()
    .insert(users)
    .values({ clerkUserId, email })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning();
  if (inserted[0]) return inserted[0];

  // Concurrent first requests can race the insert; the row exists now.
  const row = await getDb().query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (!row) throw new HttpError(500, "Failed to provision user");
  return row;
}

export function hasSyncAccess(user: User): boolean {
  if (!env.REQUIRE_SUBSCRIPTION) return true;
  if (user.subscriptionStatus === "active") return true;
  return Boolean(user.email && env.COMP_USER_EMAILS.includes(user.email.toLowerCase()));
}

export function requireSyncAccess(user: User): void {
  if (!hasSyncAccess(user)) {
    throw new HttpError(402, "Active subscription required for cloud sync");
  }
}
