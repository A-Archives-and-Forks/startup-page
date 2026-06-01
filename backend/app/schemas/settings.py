from datetime import datetime
from typing import Any
from pydantic import BaseModel


class SettingsPayload(BaseModel):
    settings: dict[str, Any]
    schema_version: int = 2
    client_updated_at: datetime | None = None


class SettingsResponse(BaseModel):
    settings: dict[str, Any]
    schema_version: int
    server_updated_at: datetime
    client_updated_at: datetime | None
