import stripe
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.subscription import SubscriptionStatusResponse, CheckoutResponse
from app.config import settings as app_settings
import app.services.stripe_client  # ensure stripe.api_key is set

router = APIRouter(tags=["subscription"])


@router.get("/subscription/status", response_model=SubscriptionStatusResponse)
async def subscription_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return SubscriptionStatusResponse(
        status=user.subscription_status,
        period_end=user.subscription_period_end,
    )


@router.post("/subscription/create-checkout", response_model=CheckoutResponse)
async def create_checkout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Reuse existing Stripe customer if available
    customer_id = user.stripe_customer_id
    if not customer_id:
        customer = stripe.Customer.create(
            email=user.email or "",
            metadata={"clerk_user_id": user.clerk_user_id},
        )
        customer_id = customer.id
        user.stripe_customer_id = customer_id
        await db.commit()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": app_settings.STRIPE_PRICE_ID, "quantity": 1}],
        mode="subscription",
        success_url=f"{app_settings.APP_URL}/#/?checkout=success",
        cancel_url=f"{app_settings.APP_URL}/#/?checkout=cancel",
        client_reference_id=user.clerk_user_id,
    )
    return CheckoutResponse(checkout_url=session.url)
