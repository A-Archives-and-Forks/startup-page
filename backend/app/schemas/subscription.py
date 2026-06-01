from datetime import datetime
from pydantic import BaseModel


class SubscriptionStatusResponse(BaseModel):
    status: str  # none | active | past_due | canceled
    period_end: datetime | None = None


class CheckoutResponse(BaseModel):
    checkout_url: str
