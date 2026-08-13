"""Backend tests for Daily Goal endpoints (iteration 12).

Covers:
- GET /api/players/{id}/daily-goal shape (goal, progress, target, completed, claimed, claimable)
- POST /api/players/{id}/daily-goal-progress only increments the ACTIVE metric
  (other counters are ignored)
- POST /api/players/{id}/claim-daily-goal grants reward exactly once
  (400 'Goal not complete' when under target, 400 'Already claimed' on second claim)
- Progress accumulates across multiple calls
- Progress calls AFTER claim do not further change progress
"""
import os
import pytest
import requests

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/') if 'EXPO_PUBLIC_BACKEND_URL' in os.environ else None
if not BASE_URL:
    # Fall back to the frontend .env (public URL used by the app itself)
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().strip('"').rstrip('/')
                break

assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing"

DAILY_GOALS = [
    {"id": "special3",  "metric": "special_served",   "target": 3,  "reward": 150},
    {"id": "serve25",   "metric": "customers_served", "target": 25, "reward": 120},
    {"id": "perfect15", "metric": "perfect_serves",   "target": 15, "reward": 140},
    {"id": "levels3",   "metric": "levels_completed", "target": 3,  "reward": 130},
    {"id": "fans5",     "metric": "fans_served",      "target": 5,  "reward": 150},
]

OTHER_METRICS_POOL = ["special_served", "customers_served", "perfect_serves", "levels_completed", "fans_served"]


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def player(api_client):
    r = api_client.post(f"{BASE_URL}/api/players", json={"username": "TEST_dailygoal"})
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- shape ----------------
def test_daily_goal_status_shape(api_client, player):
    r = api_client.get(f"{BASE_URL}/api/players/{player['id']}/daily-goal")
    assert r.status_code == 200, r.text
    data = r.json()
    for k in ("goal", "progress", "target", "completed", "claimed", "claimable"):
        assert k in data, f"missing key: {k}"
    goal = data["goal"]
    for k in ("id", "metric", "target", "reward", "label", "icon"):
        assert k in goal, f"missing goal key: {k}"
    assert data["progress"] == 0
    assert data["target"] == goal["target"]
    assert data["claimed"] is False
    assert data["completed"] is False
    assert data["claimable"] is False
    # goal must match one of the pool
    assert any(goal["id"] == g["id"] and goal["metric"] == g["metric"]
               and goal["target"] == g["target"] and goal["reward"] == g["reward"]
               for g in DAILY_GOALS), f"unexpected goal: {goal}"


# ---------------- progress: only active metric counts ----------------
def test_progress_only_active_metric(api_client, player):
    status = api_client.get(f"{BASE_URL}/api/players/{player['id']}/daily-goal").json()
    active_metric = status["goal"]["metric"]

    # Send every OTHER metric with 999, and the active one with 0 — progress must stay 0.
    payload = {m: 999 for m in OTHER_METRICS_POOL if m != active_metric}
    payload[active_metric] = 0
    r = api_client.post(f"{BASE_URL}/api/players/{player['id']}/daily-goal-progress", json=payload)
    assert r.status_code == 200, r.text
    assert r.json()["progress"] == 0, "Non-active metrics leaked into progress!"

    # Now send active metric = 1 and other metrics huge — progress must advance by exactly 1.
    payload2 = {m: 500 for m in OTHER_METRICS_POOL if m != active_metric}
    payload2[active_metric] = 1
    r2 = api_client.post(f"{BASE_URL}/api/players/{player['id']}/daily-goal-progress", json=payload2)
    assert r2.status_code == 200
    assert r2.json()["progress"] == 1


# ---------------- progress accumulates ----------------
def test_progress_accumulates(api_client, player):
    status = api_client.get(f"{BASE_URL}/api/players/{player['id']}/daily-goal").json()
    metric = status["goal"]["metric"]
    target = status["goal"]["target"]

    running = 0
    for chunk in (1, 2, 3):
        r = api_client.post(
            f"{BASE_URL}/api/players/{player['id']}/daily-goal-progress",
            json={metric: chunk},
        )
        assert r.status_code == 200
        running += chunk
        assert r.json()["progress"] == min(running, target)


# ---------------- claim requires completion ----------------
def test_claim_requires_complete(api_client, player):
    r = api_client.post(f"{BASE_URL}/api/players/{player['id']}/claim-daily-goal")
    assert r.status_code == 400
    assert r.json().get("detail") == "Goal not complete"


# ---------------- claim happy path + idempotency ----------------
def test_claim_grants_reward_once(api_client, player):
    status = api_client.get(f"{BASE_URL}/api/players/{player['id']}/daily-goal").json()
    metric = status["goal"]["metric"]
    target = status["goal"]["target"]
    reward = status["goal"]["reward"]

    # Push progress to target
    r = api_client.post(
        f"{BASE_URL}/api/players/{player['id']}/daily-goal-progress",
        json={metric: target},
    )
    body = r.json()
    assert r.status_code == 200
    assert body["progress"] == target
    assert body["completed"] is True
    assert body["claimable"] is True

    coins_before = api_client.get(f"{BASE_URL}/api/players/{player['id']}").json()["coins"]
    claim = api_client.post(f"{BASE_URL}/api/players/{player['id']}/claim-daily-goal")
    assert claim.status_code == 200, claim.text
    cbody = claim.json()
    assert cbody["reward"] == reward
    assert cbody["player"]["coins"] == coins_before + reward

    # second claim -> 400 Already claimed
    claim2 = api_client.post(f"{BASE_URL}/api/players/{player['id']}/claim-daily-goal")
    assert claim2.status_code == 400
    assert claim2.json().get("detail") == "Already claimed"

    # status now reflects claimed=True, claimable=False
    st2 = api_client.get(f"{BASE_URL}/api/players/{player['id']}/daily-goal").json()
    assert st2["claimed"] is True
    assert st2["claimable"] is False


# ---------------- progress AFTER claim is a no-op ----------------
def test_progress_after_claim_is_frozen(api_client, player):
    status = api_client.get(f"{BASE_URL}/api/players/{player['id']}/daily-goal").json()
    metric = status["goal"]["metric"]
    target = status["goal"]["target"]

    api_client.post(
        f"{BASE_URL}/api/players/{player['id']}/daily-goal-progress",
        json={metric: target},
    )
    api_client.post(f"{BASE_URL}/api/players/{player['id']}/claim-daily-goal")

    # Try to push more progress after claim
    r = api_client.post(
        f"{BASE_URL}/api/players/{player['id']}/daily-goal-progress",
        json={metric: 10},
    )
    assert r.status_code == 200
    # progress must remain at target (clamped) and claimed still true
    body = r.json()
    assert body["progress"] == target, f"progress advanced past claim: {body}"
    assert body["claimed"] is True


# ---------------- 404 for unknown player ----------------
def test_unknown_player_404(api_client):
    r = api_client.get(f"{BASE_URL}/api/players/does-not-exist/daily-goal")
    assert r.status_code == 404
