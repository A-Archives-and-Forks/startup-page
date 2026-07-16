import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "../_lib/db.js";
import { users, type User } from "../_lib/schema.js";
import { getStripe } from "../_lib/stripe.js";
import { env } from "../_lib/env.js";
import { json } from "../_lib/http.js";

function customerIdOf(customer: string | { id: string } | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function findUserByCustomer(customerId: string): Promise<User | null> {
  const byCustomer = await getDb().query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });
  if (byCustomer) return byCustomer;

  // Webhook ordering fallback: subscription events can arrive before
  // checkout.session.completed links the customer. The customer's metadata
  // carries the clerk_user_id set when the customer was created.
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (!customer.deleted) {
      // Customer.deleted is typed `void`, so !deleted doesn't narrow the union.
      const clerkUserId = (customer as Stripe.Customer).metadata?.clerk_user_id;
      if (clerkUserId) {
        const user = await getDb().query.users.findFirst({
          where: eq(users.clerkUserId, clerkUserId),
        });
        if (user) {
          await getDb()
            .update(users)
            .set({ stripeCustomerId: customerId, updatedAt: new Date() })
            .where(eq(users.id, user.id));
          return { ...user, stripeCustomerId: customerId };
        }
      }
    }
  } catch {
    // Fall through — unlinked customer.
  }
  return null;
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  // API versions ≥ 2025-03-31 moved current_period_end onto subscription items.
  const ts =
    sub.items?.data?.[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return json({ detail: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const clerkUserId = session.client_reference_id;
      const customerId = customerIdOf(session.customer);
      if (clerkUserId && customerId) {
        const user = await getDb().query.users.findFirst({
          where: eq(users.clerkUserId, clerkUserId),
        });
        if (user && !user.stripeCustomerId) {
          await getDb()
            .update(users)
            .set({ stripeCustomerId: customerId, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const customerId = customerIdOf(sub.customer);
      const user = customerId ? await findUserByCustomer(customerId) : null;
      if (user) {
        await getDb()
          .update(users)
          .set({
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
            subscriptionPeriodEnd: subscriptionPeriodEnd(sub),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = customerIdOf(sub.customer);
      const user = customerId ? await findUserByCustomer(customerId) : null;
      if (user) {
        await getDb()
          .update(users)
          .set({
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            subscriptionPeriodEnd: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = customerIdOf(invoice.customer);
      const user = customerId ? await findUserByCustomer(customerId) : null;
      if (user) {
        await getDb()
          .update(users)
          .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
      break;
    }
  }

  return json({ received: true });
}
