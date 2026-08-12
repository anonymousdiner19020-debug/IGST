"""Backend API tests for Philly Fare Match game."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://cooking-combo-philly.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def player(client):
    r = client.post(f"{API}/players", json={"username": "TEST_Chef"})
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Static catalogs ----------
class TestCatalog:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200

    def test_dishes(self, client):
        r = client.get(f"{API}/dishes")
        assert r.status_code == 200
        dishes = r.json()["dishes"]
        assert len(dishes) == 8
        for d in dishes:
            assert set(["id", "name", "emoji", "unlock_level", "recipe", "reward_coins", "moves"]).issubset(d)
        assert dishes[0]["id"] == "cheesesteak"

    def test_shop(self, client):
        r = client.get(f"{API}/shop")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 5


# ---------- Player CRUD ----------
class TestPlayer:
    def test_create_player_starts_with_100_coins(self, player):
        assert player["coins"] == 100
        assert player["current_level"] == 1
        assert "cheesesteak" in player["unlocked_dishes"]
        assert player["high_score"] == 0
        assert "id" in player and player["id"]

    def test_no_object_id_leak(self, client, player):
        r = client.get(f"{API}/players/{player['id']}")
        assert r.status_code == 200
        assert "_id" not in r.json()

    def test_get_player_404(self, client):
        r = client.get(f"{API}/players/does-not-exist")
        assert r.status_code == 404


# ---------- Level completion ----------
class TestCompleteLevel:
    def test_complete_level_unlocks_next(self, client, player):
        pid = player["id"]
        r = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "cheesesteak", "score": 500, "coins_earned": 50, "completed": True,
        })
        assert r.status_code == 200
        d = r.json()
        assert "soft_pretzel" in d["unlocked_dishes"]
        assert d["current_level"] == 2
        assert d["high_score"] == 500
        assert d["dishes_cooked"] == 1
        assert d["coins"] >= 100 + 50

    def test_incomplete_does_not_unlock(self, client):
        # new player for isolation
        pl = client.post(f"{API}/players", json={"username": "TEST_Fail"}).json()
        r = client.post(f"{API}/players/{pl['id']}/complete-level", json={
            "level": 1, "dish_id": "cheesesteak", "score": 50, "coins_earned": 2, "completed": False,
        })
        assert r.status_code == 200
        d = r.json()
        assert "soft_pretzel" not in d["unlocked_dishes"]
        assert d["current_level"] == 1
        assert d["dishes_cooked"] == 0


# ---------- Purchase / booster ----------
class TestPurchase:
    def test_purchase_deducts_and_adds_booster(self, client):
        pl = client.post(f"{API}/players", json={"username": "TEST_Buy"}).json()
        pid = pl["id"]
        r = client.post(f"{API}/players/{pid}/purchase", json={"item_id": "hint"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["coins"] == 100 - 25
        assert d["boosters"]["hint"] >= 2  # started with 1

    def test_purchase_insufficient(self, client):
        pl = client.post(f"{API}/players", json={"username": "TEST_Poor"}).json()
        pid = pl["id"]
        # drain by many coin_doubler purchases (60 each) -> only can buy 1 with 100 coins
        client.post(f"{API}/players/{pid}/purchase", json={"item_id": "coin_doubler"})
        r = client.post(f"{API}/players/{pid}/purchase", json={"item_id": "coin_doubler"})
        assert r.status_code == 400

    def test_purchase_invalid_item(self, client, player):
        r = client.post(f"{API}/players/{player['id']}/purchase", json={"item_id": "nope"})
        assert r.status_code == 404

    def test_use_booster_decrements(self, client):
        pl = client.post(f"{API}/players", json={"username": "TEST_Use"}).json()
        pid = pl["id"]
        # starts with hint=1
        r = client.post(f"{API}/players/{pid}/use-booster", json={"item_id": "hint"})
        assert r.status_code == 200
        assert r.json()["boosters"]["hint"] == 0
        # second use should fail
        r2 = client.post(f"{API}/players/{pid}/use-booster", json={"item_id": "hint"})
        assert r2.status_code == 400


# ---------- Daily Special ----------
class TestDailySpecial:
    def test_daily_special_shape_and_determinism(self, client):
        r1 = client.get(f"{API}/daily-special")
        assert r1.status_code == 200
        d1 = r1.json()
        assert set(["date", "dish_id", "name", "emoji", "bonus_multiplier"]).issubset(d1)
        assert d1["bonus_multiplier"] == 2.0
        # Deterministic: repeat call yields same dish_id for same day
        r2 = client.get(f"{API}/daily-special")
        assert r2.json()["dish_id"] == d1["dish_id"]
        # dish_id belongs to catalog
        dishes = client.get(f"{API}/dishes").json()["dishes"]
        assert d1["dish_id"] in [d["id"] for d in dishes]


# ---------- Grill Upgrade ----------
class TestGrill:
    def test_grill_info_defaults(self, client):
        pl = client.post(f"{API}/players", json={"username": "TEST_GrillInfo"}).json()
        r = client.get(f"{API}/grill-info/{pl['id']}")
        assert r.status_code == 200
        g = r.json()
        assert g["grill_level"] == 0
        assert g["max_level"] == 3
        assert g["next_cost"] == 150
        assert g["maxed"] is False
        # Player doc includes grill_level default 0
        assert pl.get("grill_level", 0) == 0

    def test_upgrade_grill_insufficient_coins(self, client):
        pl = client.post(f"{API}/players", json={"username": "TEST_GrillPoor"}).json()
        r = client.post(f"{API}/players/{pl['id']}/upgrade-grill")
        assert r.status_code == 400  # 100 < 150

    def test_upgrade_grill_full_progression(self, client):
        pl = client.post(f"{API}/players", json={"username": "TEST_GrillRich"}).json()
        pid = pl["id"]
        # Give plenty of coins by simulating a level completion with huge coins_earned
        r = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "cheesesteak", "score": 0, "coins_earned": 2000, "completed": False,
        })
        assert r.status_code == 200
        # First upgrade: 150
        r1 = client.post(f"{API}/players/{pid}/upgrade-grill")
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["grill_level"] == 1
        g1 = client.get(f"{API}/grill-info/{pid}").json()
        assert g1["next_cost"] == 300

        # Second upgrade: 300
        r2 = client.post(f"{API}/players/{pid}/upgrade-grill")
        assert r2.status_code == 200, r2.text
        assert r2.json()["grill_level"] == 2
        g2 = client.get(f"{API}/grill-info/{pid}").json()
        assert g2["next_cost"] == 450

        # Third upgrade: 450 -> maxed
        r3 = client.post(f"{API}/players/{pid}/upgrade-grill")
        assert r3.status_code == 200, r3.text
        assert r3.json()["grill_level"] == 3
        g3 = client.get(f"{API}/grill-info/{pid}").json()
        assert g3["maxed"] is True
        assert g3["next_cost"] is None

        # Extra upgrade rejected
        r4 = client.post(f"{API}/players/{pid}/upgrade-grill")
        assert r4.status_code == 400


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_leaderboard_sorted(self, client):
        r = client.get(f"{API}/leaderboard")
        assert r.status_code == 200
        rows = r.json()["leaderboard"]
        scores = [row["high_score"] for row in rows]
        assert scores == sorted(scores, reverse=True)
        for row in rows:
            assert "_id" not in row
