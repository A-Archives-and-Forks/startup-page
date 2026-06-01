from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.dependencies import get_db, require_subscription
from app.models.user import User, UserSettings
from app.schemas.settings import SettingsPayload, SettingsResponse

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    user: User = Depends(require_subscription),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No settings saved yet")
    return SettingsResponse(
        settings=row.settings,
        schema_version=row.schema_version,
        server_updated_at=row.server_updated_at,
        client_updated_at=row.client_updated_at,
    )


@router.put("/settings", response_model=SettingsResponse)
async def put_settings(
    payload: SettingsPayload,
    user: User = Depends(require_subscription),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        pg_insert(UserSettings)
        .values(
            user_id=user.id,
            schema_version=payload.schema_version,
            settings=payload.settings,
            client_updated_at=payload.client_updated_at,
        )
        .on_conflict_do_update(
            constraint="uq_user_settings",
            set_={
                "schema_version": payload.schema_version,
                "settings": payload.settings,
                "client_updated_at": payload.client_updated_at,
            },
        )
        .returning(UserSettings)
    )
    result = await db.execute(stmt)
    await db.commit()
    row = result.scalar_one()
    return SettingsResponse(
        settings=row.settings,
        schema_version=row.schema_version,
        server_updated_at=row.server_updated_at,
        client_updated_at=row.client_updated_at,
    )
