from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import SessionLocal
from app.services.clerk import decode_clerk_jwt
from app.models.user import User


async def get_db():
    async with SessionLocal() as session:
        yield session


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    payload = decode_clerk_jwt(token)
    clerk_user_id: str = payload.get("sub", "")
    if not clerk_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user = result.scalar_one_or_none()

    if not user:
        # Lazy provision: create user row on first authenticated request
        email = payload.get("email") or (payload.get("email_addresses") or [{}])[0].get("email_address")
        user = User(clerk_user_id=clerk_user_id, email=email)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def require_subscription(user: User = Depends(get_current_user)) -> User:
    if user.subscription_status != "active":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Active subscription required for cloud sync",
        )
    return user
