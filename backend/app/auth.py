"""Provider ID-token verification (JWKS) and backend session JWTs.

The extension sends the Google/Microsoft ID token once; we verify it against
the provider's JWKS (signature, iss, aud, exp), derive a stable user id
("provider:sub"), and hand back our own short-lived session JWT. All /api/*
routes then only depend on that session token.
"""

from __future__ import annotations

import os
import time
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
MICROSOFT_JWKS_URL = "https://login.microsoftonline.com/common/discovery/v2.0/keys"
MICROSOFT_ISSUER_PREFIX = "https://login.microsoftonline.com/"

SESSION_ALGO = "HS256"
SESSION_TTL_SECONDS = int(os.environ.get("SESSION_TTL_SECONDS", str(24 * 3600)))


def _session_secret() -> str:
    secret = os.environ.get("SESSION_SECRET")
    if not secret:
        raise RuntimeError("SESSION_SECRET must be set (see backend/.env.example)")
    return secret


_jwk_clients: dict[str, jwt.PyJWKClient] = {}


def _signing_key(jwks_url: str, token: str) -> jwt.PyJWK:
    client = _jwk_clients.get(jwks_url)
    if client is None:
        client = jwt.PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
        _jwk_clients[jwks_url] = client
    return client.get_signing_key_from_jwt(token)


def verify_provider_token(provider: str, id_token: str) -> str:
    """Verify an ID token against the provider JWKS; return a stable user id.

    Raises HTTPException(401) on any verification failure.
    """
    try:
        if provider == "google":
            audience = os.environ.get("GOOGLE_CLIENT_ID")
            if not audience:
                raise HTTPException(500, "GOOGLE_CLIENT_ID not configured")
            key = _signing_key(GOOGLE_JWKS_URL, id_token)
            claims = jwt.decode(
                id_token, key.key, algorithms=["RS256"], audience=audience
            )
            if claims.get("iss") not in GOOGLE_ISSUERS:
                raise jwt.InvalidIssuerError(claims.get("iss"))
            return f"google:{claims['sub']}"

        if provider == "microsoft":
            audience = os.environ.get("MICROSOFT_CLIENT_ID")
            if not audience:
                raise HTTPException(500, "MICROSOFT_CLIENT_ID not configured")
            key = _signing_key(MICROSOFT_JWKS_URL, id_token)
            claims = jwt.decode(
                id_token, key.key, algorithms=["RS256"], audience=audience
            )
            iss = str(claims.get("iss", ""))
            if not iss.startswith(MICROSOFT_ISSUER_PREFIX):
                raise jwt.InvalidIssuerError(iss)
            # `oid` is stable across apps for one account; fall back to sub.
            subject = claims.get("oid") or claims["sub"]
            return f"microsoft:{subject}"
    except HTTPException:
        raise
    except jwt.PyJWTError as exc:
        raise HTTPException(401, f"Invalid provider token: {exc}") from exc
    except Exception as exc:  # JWKS fetch errors, malformed tokens…
        raise HTTPException(401, "Provider token verification failed") from exc

    raise HTTPException(400, f"Unknown provider: {provider}")


def issue_session_token(user_id: str, now: int | None = None) -> tuple[str, int]:
    """Create a backend session JWT. Returns (token, expires_at_unix)."""
    iat = now if now is not None else int(time.time())
    exp = iat + SESSION_TTL_SECONDS
    token = jwt.encode(
        {"sub": user_id, "iat": iat, "exp": exp, "typ": "session"},
        _session_secret(),
        algorithm=SESSION_ALGO,
    )
    return token, exp


_bearer = HTTPBearer(auto_error=False)


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """FastAPI dependency: the user id is always derived from the session JWT,
    never from the request body — a user can only touch their own save."""
    if credentials is None:
        raise HTTPException(401, "Missing bearer token")
    try:
        claims = jwt.decode(
            credentials.credentials, _session_secret(), algorithms=[SESSION_ALGO]
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(401, f"Invalid session token: {exc}") from exc
    if claims.get("typ") != "session":
        raise HTTPException(401, "Not a session token")
    return str(claims["sub"])
