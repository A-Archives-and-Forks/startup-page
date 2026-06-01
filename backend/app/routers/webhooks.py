import stripe
from fastapi import APIRouter, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db
from app.models.user import User
from app.config import settings as app_settings
from fastapi import Depends
import app.services.stripe_client  # ensure stripe.api_key is set
from datetime import datetime, timezone

router = APIRouter(tags=["webhooks"])


async def _get_user_by_customer(customer_id: str, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    return result.scalar_one_or_none()


async def _get_user_by_clerk_id(clerk_user_id: str, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    return result.scalar_one_or_none()


@router.post("/webhooks/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, app_settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        # Link Stripe customer to user row
        clerk_user_id = data.get("client_reference_id")
        customer_id = data.get("customer")
        if clerk_user_id and customer_id:
            user = await _get_user_by_clerk_id(clerk_user_id, db)
            if user and not user.stripe_customer_id:
                user.stripe_customer_id = customer_id
                await db.commit()

    elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
        customer_id = data.get("customer")
        user = await _get_user_by_customer(customer_id, db)
        if user:
            user.stripe_subscription_id = data["id"]
            user.subscription_status = data["status"]  # active, past_due, canceled, etc.
            period_end_ts = data.get("current_period_end")
            if period_end_ts:
                user.subscription_period_end = datetime.fromtimestamp(period_end_ts, tz=timezone.utc)
            await db.commit()

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        user = await _get_user_by_customer(customer_id, db)
        if user:
            user.subscription_status = "canceled"
            user.stripe_subscription_id = None
            user.subscription_period_end = None
            await db.commit()

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        user = await _get_user_by_customer(customer_id, db)
        if user:
            user.subscription_status = "past_due"
            await db.commit()

    return {"received": True}
