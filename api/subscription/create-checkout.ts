import { eq } from "drizzle-orm";
import { getDb } from "../_lib/db.js";
import { users } from "../_lib/schema.js";
import { getCurrentUser } from "../_lib/auth.js";
import { getStripe } from "../_lib/stripe.js";
import { env } from "../_lib/env.js";
import { json, errorResponse } from "../_lib/http.js";

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser(request);
    const stripe = getStripe();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        // clerk_user_id metadata lets the webhook link a customer to a user
        // even when subscription events arrive before checkout.session.completed.
        metadata: { clerk_user_id: user.clerkUserId },
      });
      customerId = customer.id;
      await getDb()
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${env.APP_URL}/#/?checkout=success`,
      cancel_url: `${env.APP_URL}/#/?checkout=cancel`,
      client_reference_id: user.clerkUserId,
    });

    return json({ checkout_url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
