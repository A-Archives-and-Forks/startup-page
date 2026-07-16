/**
 * Server-side environment access. Lazy getters so routes that don't need a
 * variable (e.g. /api/health) never crash on a missing one.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get CLERK_SECRET_KEY() {
    return required("CLERK_SECRET_KEY");
  },
  get STRIPE_SECRET_KEY() {
    return required("STRIPE_SECRET_KEY");
  },
  get STRIPE_WEBHOOK_SECRET() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  get STRIPE_PRICE_ID() {
    return required("STRIPE_PRICE_ID");
  },

  /** Where Stripe checkout redirects back to. Falls back to the deployment's own URL on Vercel. */
  get APP_URL(): string {
    if (process.env.APP_URL) return process.env.APP_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  },

  /** Set to "false" on self-hosted installs to give every signed-in user sync access. */
  get REQUIRE_SUBSCRIPTION(): boolean {
    return process.env.REQUIRE_SUBSCRIPTION !== "false";
  },

  /** Comma-separated emails that get sync access without a Stripe subscription. */
  get COMP_USER_EMAILS(): string[] {
    return (process.env.COMP_USER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  },
};
