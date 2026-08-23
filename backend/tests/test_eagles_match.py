"""Eagles Match (Mini 2) reward endpoint tests.

Rules:
- If completed==True AND misses<=3: coins_awarded = 100 - 10*misses.
- Otherwise: coins_awarded = 5 (consolation).
- misses clamped to 0..20.
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
    r = client.post(f"{API}/players", json={"username": "TEST_EM"})
    assert r.status_code == 200, r.text
    return r.json()


# (completed, misses, expected_coins) per problem spec
CASES = [
    (True, 0, 100),
    (True, 1, 90),
    (True, 3, 70),
    (True, 4, 5),
    (False, 0, 5),
    (False, 2, 5),
]


@pytest.mark.parametrize("completed,misses,expected", CASES)
def test_eagles_match_reward(client, fresh_player, completed, misses, expected):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    r = client.post(
        f"{API}/players/{pid}/eagles-match",
        json={"completed": completed, "misses": misses},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["coins_awarded"] == expected, body
    assert body["completed"] == completed
    assert body["misses"] == misses
    # Player coin delta must match awarded coins exactly.
    assert body["player"]["coins"] == coins_before + expected

    # GET confirms persistence.
    g = client.get(f"{API}/players/{pid}")
    assert g.status_code == 200
    assert g.json()["coins"] == coins_before + expected


def test_eagles_match_clamps_misses_high(client, fresh_player):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    # 999 misses clamped to 20; completed True but misses>3 -> 5 coins.
    r = client.post(
        f"{API}/players/{pid}/eagles-match", json={"completed": True, "misses": 999}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["misses"] == 20
    assert body["coins_awarded"] == 5
    assert body["player"]["coins"] == coins_before + 5


def test_eagles_match_clamps_misses_negative(client, fresh_player):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    r = client.post(
        f"{API}/players/{pid}/eagles-match", json={"completed": True, "misses": -3}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["misses"] == 0
    assert body["coins_awarded"] == 100
    assert body["player"]["coins"] == coins_before + 100


def test_eagles_match_unknown_player_returns_404(client):
    r = client.post(
        f"{API}/does-not-exist/eagles-match",  # wrong path guardrail
        json={"completed": True, "misses": 0},
    )
    # This path won't exist; ensure the real one 404s:
    r = client.post(
        f"{API}/players/does-not-exist/eagles-match",
        json={"completed": True, "misses": 0},
    )
    assert r.status_code == 404
