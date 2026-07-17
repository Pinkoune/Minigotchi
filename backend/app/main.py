import time
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import insert, select, update

from .auth import current_user, issue_session_token, verify_provider_token
from .db import get_engine
from .models import saves
from .schemas import SaveEnvelope, SavePutRequest, SessionRequest, SessionResponse

app = FastAPI(title="Minigotchi API", version="0.1.0")

# The extension calls the API from its own origin (chrome-extension://…).
# Requests are authorized by the session JWT; CORS just has to let them through.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://.*|moz-extension://.*|http://localhost(:\d+)?",
    allow_methods=["GET", "PUT", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/auth/session", response_model=SessionResponse)
def create_session(body: SessionRequest) -> SessionResponse:
    user_id = verify_provider_token(body.provider, body.id_token)
    token, expires_at = issue_session_token(user_id)
    return SessionResponse(token=token, user_id=user_id, expires_at=expires_at)


@app.post("/auth/refresh", response_model=SessionResponse)
def refresh_session(user_id: Annotated[str, Depends(current_user)]) -> SessionResponse:
    token, expires_at = issue_session_token(user_id)
    return SessionResponse(token=token, user_id=user_id, expires_at=expires_at)


@app.get("/api/save", response_model=SaveEnvelope)
def get_save(user_id: Annotated[str, Depends(current_user)]) -> SaveEnvelope:
    with get_engine().connect() as conn:
        row = conn.execute(select(saves).where(saves.c.user_id == user_id)).first()
    if row is None:
        raise HTTPException(404, "No save yet")
    return SaveEnvelope(save=row.save_json, rev=row.rev)


@app.put("/api/save", response_model=SaveEnvelope)
def put_save(
    body: SavePutRequest, user_id: Annotated[str, Depends(current_user)]
) -> SaveEnvelope | JSONResponse:
    """Optimistic concurrency: the write only lands if the server revision
    still equals `base_rev`; otherwise 409 with the up-to-date server save."""
    now_ms = int(time.time() * 1000)
    engine = get_engine()
    with engine.begin() as conn:
        row = conn.execute(select(saves).where(saves.c.user_id == user_id)).first()

        if row is None:
            conn.execute(
                insert(saves).values(
                    user_id=user_id, save_json=body.save, rev=1, updated_at=now_ms
                )
            )
            return SaveEnvelope(save=body.save, rev=1)

        if row.rev != body.base_rev:
            return JSONResponse(
                status_code=409,
                content={"save": row.save_json, "rev": row.rev},
            )

        new_rev = row.rev + 1
        conn.execute(
            update(saves)
            .where(saves.c.user_id == user_id, saves.c.rev == body.base_rev)
            .values(save_json=body.save, rev=new_rev, updated_at=now_ms)
        )
    return SaveEnvelope(save=body.save, rev=new_rev)
