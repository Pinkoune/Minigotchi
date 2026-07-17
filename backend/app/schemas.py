from typing import Any, Literal

from pydantic import BaseModel, Field


class SessionRequest(BaseModel):
    provider: Literal["google", "microsoft"]
    id_token: str


class SessionResponse(BaseModel):
    token: str
    user_id: str
    expires_at: int  # unix seconds


class SaveEnvelope(BaseModel):
    save: dict[str, Any]
    rev: int


class SavePutRequest(BaseModel):
    save: dict[str, Any]
    base_rev: int = Field(ge=0, description="Revision the client based its copy on")
