import { getCurrentUser, hasSyncAccess } from "../_lib/auth.js";
import { json, errorResponse } from "../_lib/http.js";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await getCurrentUser(request);
    return json({
      // Comped users (COMP_USER_EMAILS) and REQUIRE_SUBSCRIPTION=false installs
      // report "active" so the client unlocks sync without a Stripe subscription.
      status: hasSyncAccess(user) ? "active" : user.subscriptionStatus,
      period_end: user.subscriptionPeriodEnd,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
