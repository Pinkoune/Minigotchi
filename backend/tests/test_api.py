"""Backend tests: token verification wiring, per-user isolation, optimistic
concurrency (409 on stale rev)."""

import os

import pytest
from fastapi.testclient import TestClient

os.environ["SESSION_SECRET"] = "test-secret-0123456789abcdef0123456789abcdef"

from app import auth as auth_module  # noqa: E402
from app import db as db_module  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/test.db")
    db_module.reset_engine()
    with TestClient(app) as c:
        yield c
    db_module.reset_engine()


@pytest.fixture()
def fake_provider(monkeypatch):
    """Stand-in for JWKS verification: 'good-token-<sub>' is accepted."""

    def verify(provider: str, id_token: str) -> str:
        if not id_token.startswith("good-token-"):
            from fastapi import HTTPException

            raise HTTPException(401, "Invalid provider token")
        return f"{provider}:{id_token.removeprefix('good-token-')}"

    monkeypatch.setattr(auth_module, "verify_provider_token", verify)
    # main.py imported the symbol directly, patch it there too.
    import app.main as main_module

    monkeypatch.setattr(main_module, "verify_provider_token", verify)


def login(client, sub="alice", provider="google") -> str:
    res = client.post(
        "/auth/session", json={"provider": provider, "id_token": f"good-token-{sub}"}
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["user_id"] == f"{provider}:{sub}"
    return body["token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def some_save(**overrides) -> dict:
    return {"schemaVersion": 1, "pet": None, "coins": 50, "lastTick": 0, **overrides}


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_session_rejects_bad_provider_token(client, fake_provider):
    res = client.post(
        "/auth/session", json={"provider": "google", "id_token": "forged"}
    )
    assert res.status_code == 401


def test_api_requires_session_token(client):
    assert client.get("/api/save").status_code == 401
    assert (
        client.put("/api/save", json={"save": {}, "base_rev": 0}).status_code == 401
    )
    assert client.get("/api/save", headers=auth("not-a-jwt")).status_code == 401


def test_refresh_returns_new_valid_token(client, fake_provider):
    token = login(client)
    res = client.post("/auth/refresh", headers=auth(token))
    assert res.status_code == 200
    token2 = res.json()["token"]
    assert client.get("/api/save", headers=auth(token2)).status_code == 404


def test_get_save_404_for_new_user(client, fake_provider):
    token = login(client)
    assert client.get("/api/save", headers=auth(token)).status_code == 404


def test_put_then_get_roundtrip(client, fake_provider):
    token = login(client)
    res = client.put(
        "/api/save", json={"save": some_save(coins=99), "base_rev": 0}, headers=auth(token)
    )
    assert res.status_code == 200
    assert res.json()["rev"] == 1

    res = client.get("/api/save", headers=auth(token))
    assert res.status_code == 200
    assert res.json()["save"]["coins"] == 99
    assert res.json()["rev"] == 1


def test_rev_increments_on_each_write(client, fake_provider):
    token = login(client)
    client.put("/api/save", json={"save": some_save(), "base_rev": 0}, headers=auth(token))
    res = client.put(
        "/api/save", json={"save": some_save(coins=10), "base_rev": 1}, headers=auth(token)
    )
    assert res.status_code == 200
    assert res.json()["rev"] == 2


def test_stale_rev_conflicts_with_server_save(client, fake_provider):
    """Two devices: device B writes on an outdated rev -> 409 + current save."""
    token = login(client)
    client.put("/api/save", json={"save": some_save(), "base_rev": 0}, headers=auth(token))
    # Device A writes rev 1 -> 2.
    client.put(
        "/api/save", json={"save": some_save(coins=200), "base_rev": 1}, headers=auth(token)
    )
    # Device B still thinks rev is 1.
    res = client.put(
        "/api/save", json={"save": some_save(coins=5), "base_rev": 1}, headers=auth(token)
    )
    assert res.status_code == 409
    body = res.json()
    assert body["rev"] == 2
    assert body["save"]["coins"] == 200  # server copy, not silently overwritten


def test_users_are_isolated(client, fake_provider):
    alice = login(client, sub="alice")
    bob = login(client, sub="bob")
    client.put(
        "/api/save", json={"save": some_save(coins=777), "base_rev": 0}, headers=auth(alice)
    )
    # Bob has no save of his own and can never read Alice's.
    assert client.get("/api/save", headers=auth(bob)).status_code == 404
    res = client.put(
        "/api/save", json={"save": some_save(coins=1), "base_rev": 0}, headers=auth(bob)
    )
    assert res.status_code == 200
    alice_save = client.get("/api/save", headers=auth(alice)).json()
    assert alice_save["save"]["coins"] == 777


def test_user_id_comes_from_token_not_body(client, fake_provider):
    """A save body claiming another userId is stored under the token's user."""
    alice = login(client, sub="alice")
    client.put(
        "/api/save",
        json={"save": some_save(userId="google:bob", coins=13), "base_rev": 0},
        headers=auth(alice),
    )
    bob = login(client, sub="bob")
    assert client.get("/api/save", headers=auth(bob)).status_code == 404
