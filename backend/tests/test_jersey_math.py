"""Jersey Math mini-game reward endpoint tests.

Rules:
- If `wrong` > 3: coins_awarded is a flat 10 (consolation).
- Else: coins_awarded = 10 * correct.
- correct/wrong are clamped to 0..10.
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
    r = client.post(f"{API}/players", json={"username": "TEST_JM"})
    assert r.status_code == 200, r.text
    return r.json()


# (correct, wrong) -> expected coins awarded
CASES = [
    (7, 2, 70),
    (5, 5, 10),
    (10, 0, 100),
    (2, 3, 20),
    (0, 10, 10),
    (0, 0, 0),
]


@pytest.mark.parametrize("correct,wrong,expected", CASES)
def test_jersey_math_reward(client, fresh_player, correct, wrong, expected):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    r = client.post(f"{API}/players/{pid}/jersey-math", json={"correct": correct, "wrong": wrong})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["coins_awarded"] == expected, body
    assert body["correct"] == correct
    assert body["wrong"] == wrong
    # Player coin delta must match awarded coins exactly.
    assert body["player"]["coins"] == coins_before + expected

    # GET confirms persistence.
    g = client.get(f"{API}/players/{pid}")
    assert g.status_code == 200
    assert g.json()["coins"] == coins_before + expected


def test_jersey_math_clamps_high_values(client, fresh_player):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    # 999 correct clamped to 10, 0 wrong -> 100 coins.
    r = client.post(f"{API}/players/{pid}/jersey-math", json={"correct": 999, "wrong": 0})
    assert r.status_code == 200
    body = r.json()
    assert body["correct"] == 10
    assert body["wrong"] == 0
    assert body["coins_awarded"] == 100
    assert body["player"]["coins"] == coins_before + 100


def test_jersey_math_clamps_negative_values(client, fresh_player):
    pid = fresh_player["id"]
    coins_before = fresh_player["coins"]
    r = client.post(f"{API}/players/{pid}/jersey-math", json={"correct": -5, "wrong": -3})
    assert r.status_code == 200
    body = r.json()
    assert body["correct"] == 0
    assert body["wrong"] == 0
    assert body["coins_awarded"] == 0
    assert body["player"]["coins"] == coins_before


def test_jersey_math_unknown_player_returns_404(client):
    r = client.post(f"{API}/players/does-not-exist/jersey-math", json={"correct": 5, "wrong": 0})
    assert r.status_code == 404
