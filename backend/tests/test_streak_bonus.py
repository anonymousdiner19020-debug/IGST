"""Backend tests for iteration 13: Daily-Goal claim streak bonus.

Verifies POST /api/players/{id}/claim-daily-goal now returns:
  reward, base_reward, streak_bonus, streak, player
and awards +20 coins per consecutive-day streak (capped at 7 -> +140).

Also verifies:
- GET /api/players/{id}/daily-goal includes a 'streak' field (default 0).
- 400 'Goal not complete' when progress < target.
- 400 'Already claimed' on 2nd claim same day.
- Coins credited = base_reward + streak_bonus.
- Streak resets to 1 if last claim was NOT yesterday (simulated via direct DB write).
"""
import os
import asyncio

import pytest
import requests

with open('/app/frontend/.env') as f:
    for line in f:
        if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
            break

API = f"{BASE_URL}/api"


def _load_backend_env():
    """Read MONGO_URL and DB_NAME from /app/backend/.env, stripping quotes."""
    mongo_url = db_name = None
    with open('/app/backend/.env') as f:
        for line in f:
            line = line.strip()
            if line.startswith('MONGO_URL='):
                mongo_url = line.split('=', 1)[1].strip().strip('"').strip("'")
            elif line.startswith('DB_NAME='):
                db_name = line.split('=', 1)[1].strip().strip('"').strip("'")
    return mongo_url, db_name


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def player(client):
    r = client.post(f"{API}/players", json={"username": "TEST_streak"})
    assert r.status_code == 200, r.text
    return r.json()


def _push_to_target(client, pid):
    st = client.get(f"{API}/players/{pid}/daily-goal").json()
    metric, target = st["goal"]["metric"], st["goal"]["target"]
    r = client.post(f"{API}/players/{pid}/daily-goal-progress", json={metric: target})
    assert r.status_code == 200
    assert r.json()["completed"] is True
    return st["goal"]["reward"]


def test_daily_goal_status_has_streak_field(client, player):
    r = client.get(f"{API}/players/{player['id']}/daily-goal")
    assert r.status_code == 200
    data = r.json()
    assert "streak" in data, "GET daily-goal missing 'streak' field"
    assert data["streak"] == 0


def test_claim_incomplete_returns_400(client, player):
    r = client.post(f"{API}/players/{player['id']}/claim-daily-goal")
    assert r.status_code == 400
    assert r.json().get("detail") == "Goal not complete"


def test_first_claim_shape_and_streak_bonus(client, player):
    pid = player["id"]
    base_reward = _push_to_target(client, pid)
    before = client.get(f"{API}/players/{pid}").json()["coins"]

    r = client.post(f"{API}/players/{pid}/claim-daily-goal")
    assert r.status_code == 200, r.text
    body = r.json()

    # Response shape
    for k in ("reward", "base_reward", "streak_bonus", "streak", "player"):
        assert k in body, f"missing key: {k}"

    # First claim ever: streak=1 -> streak_bonus=20 -> reward=base+20
    assert body["streak"] == 1, body
    assert body["streak_bonus"] == 20, body
    assert body["base_reward"] == base_reward, body
    assert body["reward"] == base_reward + 20, body

    # Coins increased by exactly the total reward
    assert body["player"]["coins"] == before + body["reward"], (before, body["player"]["coins"], body["reward"])

    # GET now reflects streak=1 and claimed=true
    st = client.get(f"{API}/players/{pid}/daily-goal").json()
    assert st["streak"] == 1
    assert st["claimed"] is True
    assert st["claimable"] is False


def test_second_claim_same_day_returns_400(client, player):
    pid = player["id"]
    _push_to_target(client, pid)
    r1 = client.post(f"{API}/players/{pid}/claim-daily-goal")
    assert r1.status_code == 200
    r2 = client.post(f"{API}/players/{pid}/claim-daily-goal")
    assert r2.status_code == 400
    assert r2.json().get("detail") == "Already claimed"


def test_streak_bonus_multi_day_via_db(client, player):
    """Simulate a 5-day streak by writing goal_last_claim=yesterday & prev streak=4."""
    from datetime import datetime, timezone, timedelta
    from motor.motor_asyncio import AsyncIOMotorClient

    pid = player["id"]
    base_reward = _push_to_target(client, pid)

    mongo_url, db_name = _load_backend_env()

    async def _seed():
        c = AsyncIOMotorClient(mongo_url)
        try:
            yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
            await c[db_name].players.update_one(
                {"id": pid},
                {"$set": {"goal_streak": 4, "goal_last_claim": yesterday}},
            )
        finally:
            c.close()

    asyncio.get_event_loop().run_until_complete(_seed())

    r = client.post(f"{API}/players/{pid}/claim-daily-goal")
    assert r.status_code == 200, r.text
    body = r.json()
    # prev streak was 4 with last_claim=yesterday -> new streak=5, bonus=5*20=100
    assert body["streak"] == 5, body
    assert body["streak_bonus"] == 100, body
    assert body["base_reward"] == base_reward
    assert body["reward"] == base_reward + 100


def test_streak_bonus_capped_at_7(client, player):
    """streak >7 still caps bonus at 7*20 = 140."""
    from datetime import datetime, timezone, timedelta
    from motor.motor_asyncio import AsyncIOMotorClient

    pid = player["id"]
    base_reward = _push_to_target(client, pid)

    mongo_url, db_name = _load_backend_env()

    async def _seed():
        c = AsyncIOMotorClient(mongo_url)
        try:
            yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
            await c[db_name].players.update_one(
                {"id": pid},
                {"$set": {"goal_streak": 20, "goal_last_claim": yesterday}},
            )
        finally:
            c.close()

    asyncio.get_event_loop().run_until_complete(_seed())

    r = client.post(f"{API}/players/{pid}/claim-daily-goal")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["streak"] == 21
    assert body["streak_bonus"] == 140  # min(21, 7)*20
    assert body["reward"] == base_reward + 140


def test_streak_resets_when_gap_more_than_one_day(client, player):
    """If goal_last_claim is 3 days ago, streak resets to 1 (bonus=20)."""
    from datetime import datetime, timezone, timedelta
    from motor.motor_asyncio import AsyncIOMotorClient

    pid = player["id"]
    base_reward = _push_to_target(client, pid)

    mongo_url, db_name = _load_backend_env()

    async def _seed():
        c = AsyncIOMotorClient(mongo_url)
        try:
            three_days_ago = (datetime.now(timezone.utc).date() - timedelta(days=3)).isoformat()
            await c[db_name].players.update_one(
                {"id": pid},
                {"$set": {"goal_streak": 6, "goal_last_claim": three_days_ago}},
            )
        finally:
            c.close()

    asyncio.get_event_loop().run_until_complete(_seed())

    r = client.post(f"{API}/players/{pid}/claim-daily-goal")
    assert r.status_code == 200
    body = r.json()
    assert body["streak"] == 1  # reset
    assert body["streak_bonus"] == 20
    assert body["reward"] == base_reward + 20
