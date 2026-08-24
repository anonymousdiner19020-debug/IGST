"""Hockey Shootout (Mini 3) reward endpoint tests.

Rules:
- coins_awarded = 10 * goals.
- goals clamped 0..10 (15 -> treated as 10 -> 100; negative -> 0).
- player.coins increases by exactly coins_awarded.
- Unknown player id returns 404.
"""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture()
def fresh_player(client):
    r = client.post(f"{API}/players", json={"username": "TEST_HS"})
    assert r.status_code == 200, r.text
    return r.json()


# (goals_input, expected_goals, expected_coins) per problem spec.
CASES = [
    (6, 6, 60),
    (0, 0, 0),
    (10, 10, 100),
    (15, 10, 100),   # clamp high
    (-3, 0, 0),      # clamp low
    (1, 1, 10),
]


@pytest.mark.parametrize("goals_in,goals_out,coins", CASES)
def test_hockey_shootout_reward(client, fresh_player, goals_in, goals_out, coins):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    r = client.post(
        f"{API}/players/{pid}/hockey-shootout",
        json={"goals": goals_in},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["coins_awarded"] == coins, body
    assert body["goals"] == goals_out, body
    assert body["player"]["coins"] == coins_before + coins

    # GET verifies persistence.
    g = client.get(f"{API}/players/{pid}")
    assert g.status_code == 200
    assert g.json()["coins"] == coins_before + coins


def test_hockey_shootout_missing_goals_defaults_to_zero(client, fresh_player):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    r = client.post(f"{API}/players/{pid}/hockey-shootout", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["goals"] == 0
    assert body["coins_awarded"] == 0
    assert body["player"]["coins"] == coins_before


def test_hockey_shootout_unknown_player_returns_404(client):
    r = client.post(
        f"{API}/players/does-not-exist/hockey-shootout",
        json={"goals": 5},
    )
    assert r.status_code == 404


def test_hockey_shootout_accumulates_across_calls(client, fresh_player):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    # 3 goals + 7 goals = 100 coins over two runs.
    r1 = client.post(f"{API}/players/{pid}/hockey-shootout", json={"goals": 3})
    assert r1.status_code == 200
    assert r1.json()["coins_awarded"] == 30
    r2 = client.post(f"{API}/players/{pid}/hockey-shootout", json={"goals": 7})
    assert r2.status_code == 200
    assert r2.json()["coins_awarded"] == 70
    g = client.get(f"{API}/players/{pid}")
    assert g.json()["coins"] == coins_before + 100
