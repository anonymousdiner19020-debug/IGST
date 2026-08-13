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
        # Iteration 10: 12 dishes total. Donuts has 4 base ingredients; all others 5.
        assert len(dishes) == 12
        for d in dishes:
            assert set(["id", "name", "emoji", "unlock_level", "recipe", "reward_coins", "moves"]).issubset(d)
            expected_len = 4 if d["id"] == "donuts" else 5
            assert len(d["recipe"]) == expected_len, f"{d['id']} recipe should have {expected_len} base ingredients"
        # Ordered unlock levels 1..12
        assert [d["unlock_level"] for d in dishes] == list(range(1, 13))
        expected_ids = ["soft_pretzel", "happy_cakes", "water_ice", "american_hoagie",
                        "italian_hoagie", "cheesesteak", "roast_pork",
                        "scrapple_ec", "seasoned_fries", "tomato_pie", "porkroll_ec", "donuts"]
        assert [d["id"] for d in dishes] == expected_ids
        # Soft Pretzel recipe must be exactly the frontend's 5 ingredients
        assert set(dishes[0]["recipe"].keys()) == {"dough", "salt", "cheese_sauce", "mustard", "pizza_sauce"}
        # Donuts has these 4
        donuts = next(d for d in dishes if d["id"] == "donuts")
        assert set(donuts["recipe"].keys()) == {"vanilla_donut", "chocolate_donut", "strawberry_donut", "sprinkles"}

    def test_complete_level_unlock_chain_all_12(self, client):
        """Complete levels 1..11 sequentially and verify each next dish unlocks; current_level tops at 12."""
        pid = client.post(f"{API}/players", json={"username": "TEST_UnlockChain"}).json()["id"]
        catalog = client.get(f"{API}/dishes").json()["dishes"]
        ids = [d["id"] for d in catalog]
        for lvl in range(1, 12):
            r = client.post(f"{API}/players/{pid}/complete-level", json={
                "level": lvl, "dish_id": ids[lvl - 1], "score": 100 * lvl,
                "coins_earned": 5, "completed": True,
            })
            assert r.status_code == 200, r.text
            d = r.json()
            expected_next = ids[lvl]  # the dish unlocked by completing lvl
            assert expected_next in d["unlocked_dishes"], f"lvl {lvl} did not unlock {expected_next}: {d['unlocked_dishes']}"
            assert d["current_level"] == lvl + 1
        # After completing level 11, donuts should be unlocked and current_level = 12
        final = client.get(f"{API}/players/{pid}").json()
        assert "donuts" in final["unlocked_dishes"]
        assert final["current_level"] == 12
        # Completing level 12 should not exceed 12
        r = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 12, "dish_id": "donuts", "score": 1200,
            "coins_earned": 210, "completed": True,
        })
        assert r.status_code == 200
        assert r.json()["current_level"] == 12  # capped at catalog length

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
        # New starting dish is soft_pretzel (iter 7)
        assert "soft_pretzel" in player["unlocked_dishes"]
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
            "level": 1, "dish_id": "soft_pretzel", "score": 500, "coins_earned": 50, "completed": True,
        })
        assert r.status_code == 200
        d = r.json()
        # Completing level 1 (soft_pretzel) should unlock the level-2 dish: happy_cakes
        assert "happy_cakes" in d["unlocked_dishes"]
        assert d["current_level"] == 2
        assert d["high_score"] == 500
        assert d["dishes_cooked"] == 1
        assert d["coins"] >= 100 + 50

    def test_incomplete_does_not_unlock(self, client):
        # new player for isolation
        pl = client.post(f"{API}/players", json={"username": "TEST_Fail"}).json()
        r = client.post(f"{API}/players/{pl['id']}/complete-level", json={
            "level": 1, "dish_id": "soft_pretzel", "score": 50, "coins_earned": 2, "completed": False,
        })
        assert r.status_code == 200
        d = r.json()
        assert "happy_cakes" not in d["unlocked_dishes"]
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


# ---------- Pantry (iteration 4) ----------
class TestPantry:
    def test_new_player_pantry_defaults(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_PantryNew"}).json()["id"]
        p = client.get(f"{API}/players/{pid}").json()
        assert p["pantry_level"] == 0
        assert p["pantry"] == {}
        info = client.get(f"{API}/pantry-info/{pid}").json()
        assert info["pantry_level"] == 0
        assert info["max_level"] == 3
        assert info["next_cost"] == 120
        assert info["maxed"] is False
        assert info["per_item_cap"] == 0
        assert info["pantry"] == {}

    def test_pantry_upgrade_insufficient_and_progression(self, client):
        # New player has 100 coins, cannot afford 120
        pid = client.post(f"{API}/players", json={"username": "TEST_PantryPoor"}).json()["id"]
        r = client.post(f"{API}/players/{pid}/upgrade-pantry")
        assert r.status_code == 400

        # Give coins for progression
        for _ in range(3):
            client.post(
                f"{API}/players/{pid}/complete-level",
                json={"level": 1, "dish_id": "cheesesteak", "score": 0, "coins_earned": 500, "completed": False},
            )
        # 120 -> 240 -> 360
        expected = [(1, 240), (2, 360), (3, None)]
        for lvl, next_cost in expected:
            r = client.post(f"{API}/players/{pid}/upgrade-pantry")
            assert r.status_code == 200, r.text
            assert r.json()["pantry_level"] == lvl
            info = client.get(f"{API}/pantry-info/{pid}").json()
            assert info["pantry_level"] == lvl
            assert info["next_cost"] == next_cost
            assert info["per_item_cap"] == lvl
        assert client.get(f"{API}/pantry-info/{pid}").json()["maxed"] is True

        # 4th upgrade rejected
        r = client.post(f"{API}/players/{pid}/upgrade-pantry")
        assert r.status_code == 400

    def test_save_pantry_zero_level_stores_nothing(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_PantrySaveL0"}).json()["id"]
        r = client.post(
            f"{API}/players/{pid}/save-pantry",
            json={"pantry": {"onion": 5, "cheese": 3}},
        )
        assert r.status_code == 200, r.text
        assert r.json()["pantry"] == {}

    def test_save_pantry_caps_at_level(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_PantrySaveL1"}).json()["id"]
        # Give coins and upgrade to level 1
        client.post(
            f"{API}/players/{pid}/complete-level",
            json={"level": 1, "dish_id": "cheesesteak", "score": 0, "coins_earned": 500, "completed": False},
        )
        assert client.post(f"{API}/players/{pid}/upgrade-pantry").status_code == 200
        r = client.post(
            f"{API}/players/{pid}/save-pantry",
            json={"pantry": {"onion": 5, "cheese": 2, "salt": 0, "mustard": -1}},
        )
        assert r.status_code == 200
        assert r.json()["pantry"] == {"onion": 1, "cheese": 1}

        # Upgrade to level 2 and re-save, cap now 2
        client.post(
            f"{API}/players/{pid}/complete-level",
            json={"level": 1, "dish_id": "cheesesteak", "score": 0, "coins_earned": 500, "completed": False},
        )
        assert client.post(f"{API}/players/{pid}/upgrade-pantry").status_code == 200
        r2 = client.post(
            f"{API}/players/{pid}/save-pantry",
            json={"pantry": {"onion": 5, "cheese": 2}},
        )
        assert r2.json()["pantry"] == {"onion": 2, "cheese": 2}


# ---------- Weekly Leaderboard (iteration 4) ----------
class TestWeeklyLeaderboard:
    def test_weekly_shape_and_sorted(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_WeeklyA"}).json()["id"]
        client.post(
            f"{API}/players/{pid}/complete-level",
            json={"level": 1, "dish_id": "cheesesteak", "score": 777, "coins_earned": 10, "completed": True},
        )
        r = client.get(f"{API}/weekly-leaderboard")
        assert r.status_code == 200
        data = r.json()
        # ISO week key like 2026-W03
        import re
        assert re.match(r"^\d{4}-W\d{2}$", data["week"]), data["week"]
        # resets_on YYYY-MM-DD
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", data["resets_on"]), data["resets_on"]
        assert "leaderboard" in data
        scores = [row["weekly_score"] for row in data["leaderboard"]]
        assert scores == sorted(scores, reverse=True)
        for row in data["leaderboard"]:
            assert "_id" not in row
            assert set(row.keys()) == {"id", "username", "weekly_score"}
        # champion is #1 row
        if data["leaderboard"]:
            assert data["champion"] == data["leaderboard"][0]
        # our player is on the board
        assert any(row["id"] == pid for row in data["leaderboard"])

    def test_complete_level_updates_weekly_max(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_WeeklyMax"}).json()["id"]
        client.post(
            f"{API}/players/{pid}/complete-level",
            json={"level": 1, "dish_id": "cheesesteak", "score": 300, "coins_earned": 0, "completed": False},
        )
        client.post(
            f"{API}/players/{pid}/complete-level",
            json={"level": 1, "dish_id": "cheesesteak", "score": 100, "coins_earned": 0, "completed": False},
        )
        wk = client.get(f"{API}/weekly-leaderboard").json()
        me = next(row for row in wk["leaderboard"] if row["id"] == pid)
        assert me["weekly_score"] == 300  # max, not overwritten by 100


# ---------- Iteration 5: Coin Packs / RevenueCat webhook / generic upgrades / holding ----------
import uuid as _uuid


class TestCoinPacks:
    def test_coin_packs_shape(self, client):
        r = client.get(f"{API}/coin-packs")
        assert r.status_code == 200
        packs = r.json()["packs"]
        ids = [p["product_id"] for p in packs]
        assert ids == ["coins_500", "coins_1200", "coins_3000"]
        by = {p["product_id"]: p for p in packs}
        assert by["coins_500"]["coins"] == 500
        assert by["coins_1200"]["coins"] == 1200
        assert by["coins_3000"]["coins"] == 3000
        assert by["coins_3000"]["best_value"] is True
        assert all("fallback_price" in p for p in packs)


class TestUpgradesInfo:
    def test_upgrades_info_shape_new_player(self, client):
        r = client.post(f"{API}/players", json={"username": "TEST_UInfoA"})
        pid = r.json()["id"]
        info = client.get(f"{API}/upgrades-info/{pid}").json()
        assert set(info["upgrades"].keys()) == {"grill", "pantry", "plates", "holding"}
        assert info["coins"] == 100
        assert info["upgrades"]["grill"]["next_cost"] == 150
        assert info["upgrades"]["pantry"]["next_cost"] == 120
        assert info["upgrades"]["plates"]["next_cost"] == 100
        assert info["upgrades"]["holding"]["next_cost"] == 130
        for k in ("grill", "pantry", "plates", "holding"):
            u = info["upgrades"][k]
            assert u["level"] == 0 and u["max_level"] == 3 and u["maxed"] is False

    def test_upgrades_info_404(self, client):
        assert client.get(f"{API}/upgrades-info/does-not-exist").status_code == 404


class TestGenericUpgrade:
    def _prep(self, client, coins=2000):
        pid = client.post(f"{API}/players", json={"username": "TEST_UGen"}).json()["id"]
        # Top up coins via complete-level
        client.post(
            f"{API}/players/{pid}/complete-level",
            json={"level": 1, "dish_id": "cheesesteak", "score": 100,
                  "coins_earned": coins, "completed": False},
        )
        return pid

    @pytest.mark.parametrize("key,base,field", [
        ("grill", 150, "grill_level"),
        ("pantry", 120, "pantry_level"),
        ("plates", 100, "plates_level"),
        ("holding", 130, "holding_level"),
    ])
    def test_upgrade_progression_and_scaling(self, client, key, base, field):
        pid = self._prep(client)
        for lvl in range(3):
            info_before = client.get(f"{API}/upgrades-info/{pid}").json()
            expected_cost = base * (lvl + 1)
            assert info_before["upgrades"][key]["next_cost"] == expected_cost
            coins_before = info_before["coins"]
            r = client.post(f"{API}/players/{pid}/upgrade/{key}")
            assert r.status_code == 200, r.text
            body = r.json()
            assert body[field] == lvl + 1
            assert body["coins"] == coins_before - expected_cost
        # 4th call rejected
        r = client.post(f"{API}/players/{pid}/upgrade/{key}")
        assert r.status_code == 400
        info_after = client.get(f"{API}/upgrades-info/{pid}").json()
        assert info_after["upgrades"][key]["maxed"] is True
        assert info_after["upgrades"][key]["next_cost"] is None

    def test_upgrade_insufficient_coins(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_UPoor"}).json()["id"]
        # New player has 100 coins; grill costs 150
        r = client.post(f"{API}/players/{pid}/upgrade/grill")
        assert r.status_code == 400

    def test_upgrade_unknown_key(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_UUnknown"}).json()["id"]
        r = client.post(f"{API}/players/{pid}/upgrade/lasers")
        assert r.status_code == 404

    def test_upgrade_unknown_player(self, client):
        r = client.post(f"{API}/players/nope-nope/upgrade/grill")
        assert r.status_code == 404


class TestHoldingAreaPantryCap:
    def test_holding_expands_pantry_cap(self, client):
        # Set up player with pantry_level=1 and holding_level=1 => cap = 1 + 1*2 = 3
        pid = client.post(f"{API}/players", json={"username": "TEST_Holding"}).json()["id"]
        client.post(
            f"{API}/players/{pid}/complete-level",
            json={"level": 1, "dish_id": "cheesesteak", "score": 0, "coins_earned": 1000, "completed": False},
        )
        assert client.post(f"{API}/players/{pid}/upgrade/pantry").status_code == 200
        assert client.post(f"{API}/players/{pid}/upgrade/holding").status_code == 200
        info = client.get(f"{API}/pantry-info/{pid}").json()
        assert info["pantry_level"] == 1
        assert info["per_item_cap"] == 3

        # save-pantry should cap items at 3
        r = client.post(
            f"{API}/players/{pid}/save-pantry",
            json={"pantry": {"onion": 9, "cheese": 2, "whiz": 5}},
        )
        pd = r.json()["pantry"]
        assert pd == {"onion": 3, "cheese": 2, "whiz": 3}

    def test_holding_level2_cap(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_Hold2"}).json()["id"]
        client.post(
            f"{API}/players/{pid}/complete-level",
            json={"level": 1, "dish_id": "cheesesteak", "score": 0, "coins_earned": 2000, "completed": False},
        )
        # pantry=2, holding=2 -> cap 6
        for _ in range(2):
            client.post(f"{API}/players/{pid}/upgrade/pantry")
            client.post(f"{API}/players/{pid}/upgrade/holding")
        info = client.get(f"{API}/pantry-info/{pid}").json()
        assert info["per_item_cap"] == 6
        r = client.post(
            f"{API}/players/{pid}/save-pantry",
            json={"pantry": {"onion": 20}},
        )
        assert r.json()["pantry"] == {"onion": 6}


class TestRevenueCatWebhook:
    def test_non_renewing_grants_coins_and_is_idempotent(self, client):
        p = client.post(f"{API}/players", json={"username": "TEST_RC1"}).json()
        pid = p["id"]
        starting = p["coins"]  # 100
        txn = f"TEST_TXN_{_uuid.uuid4()}"
        eid = f"TEST_EID_{_uuid.uuid4()}"
        payload = {"event": {
            "type": "NON_RENEWING_PURCHASE",
            "app_user_id": pid,
            "product_id": "coins_1200",
            "transaction_id": txn,
            "id": eid,
            "store": "APP_STORE",
            "environment": "SANDBOX",
        }}
        r = client.post(f"{API}/revenuecat/webhook", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True and body["granted"] == 1200 and body["currency"] == "coins"
        after = client.get(f"{API}/players/{pid}").json()
        assert after["coins"] == starting + 1200

        # duplicate transaction id: no double grant
        r2 = client.post(f"{API}/revenuecat/webhook", json=payload)
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True
        after2 = client.get(f"{API}/players/{pid}").json()
        assert after2["coins"] == starting + 1200

    def test_unknown_product(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_RC2"}).json()["id"]
        payload = {"event": {
            "type": "NON_RENEWING_PURCHASE",
            "app_user_id": pid,
            "product_id": "coins_9999",
            "transaction_id": f"T_{_uuid.uuid4()}",
            "id": f"E_{_uuid.uuid4()}",
        }}
        r = client.post(f"{API}/revenuecat/webhook", json=payload)
        assert r.status_code == 400

    def test_non_purchase_event_is_ignored(self, client):
        payload = {"event": {"type": "TEST", "app_user_id": "x", "product_id": "coins_500"}}
        r = client.post(f"{API}/revenuecat/webhook", json=payload)
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] is True and j.get("ignored") == "TEST"

    def test_all_three_products_grant(self, client):
        for prod, expected in [("coins_500", 500), ("coins_3000", 3000)]:
            p = client.post(f"{API}/players", json={"username": f"TEST_RC_{prod}"}).json()
            pid, base = p["id"], p["coins"]
            payload = {"event": {
                "type": "NON_RENEWING_PURCHASE",
                "app_user_id": pid,
                "product_id": prod,
                "transaction_id": f"T_{_uuid.uuid4()}",
                "id": f"E_{_uuid.uuid4()}",
            }}
            r = client.post(f"{API}/revenuecat/webhook", json=payload)
            assert r.status_code == 200
            after = client.get(f"{API}/players/{pid}").json()
            assert after["coins"] == base + expected


class TestPlayerDefaultsIter5:
    def test_new_player_has_plates_and_holding(self, client):
        p = client.post(f"{API}/players", json={"username": "TEST_Defaults5"}).json()
        assert p["plates_level"] == 0
        assert p["holding_level"] == 0
        assert "_id" not in p


# ---------- Iteration 6: Liberty Bells currency ----------
class TestBellsBackend:
    def test_new_player_starts_with_3_bells_and_public_shape(self, client):
        p = client.post(f"{API}/players", json={"username": "TEST_BellsNew"}).json()
        assert p["bells"] == 3
        assert "_id" not in p
        # GET also
        g = client.get(f"{API}/players/{p['id']}").json()
        assert g["bells"] == 3
        assert "_id" not in g

    def test_bell_packs_shape(self, client):
        r = client.get(f"{API}/bell-packs")
        assert r.status_code == 200
        packs = r.json()["packs"]
        ids = [p["product_id"] for p in packs]
        assert ids == ["bells_5", "bells_20", "bells_50"]
        by = {p["product_id"]: p for p in packs}
        assert by["bells_5"]["bells"] == 5
        assert by["bells_20"]["bells"] == 20
        assert by["bells_50"]["bells"] == 50
        assert by["bells_50"]["best_value"] is True
        for p in packs:
            assert "fallback_price" in p

    def test_complete_level_increments_bells(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_BellEarn"}).json()["id"]
        r = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "cheesesteak", "score": 250,
            "coins_earned": 12, "bells_earned": 5, "completed": True,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["bells"] == 3 + 5  # STARTING_BELLS + earned
        assert d["coins"] == 100 + 12
        assert d["high_score"] == 250
        assert d["current_level"] == 2
        assert "soft_pretzel" in d["unlocked_dishes"]

    def test_complete_level_default_bells_earned_zero(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_BellEarnZ"}).json()["id"]
        r = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "cheesesteak", "score": 100,
            "coins_earned": 3, "completed": False,
        })
        assert r.status_code == 200
        assert r.json()["bells"] == 3  # unchanged

    def test_spend_bells_success(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_Spend"}).json()["id"]
        r = client.post(f"{API}/players/{pid}/spend-bells", json={"amount": 1})
        assert r.status_code == 200, r.text
        assert r.json()["bells"] == 2
        # GET verifies persistence
        assert client.get(f"{API}/players/{pid}").json()["bells"] == 2

    def test_spend_bells_insufficient(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_SpendPoor"}).json()["id"]
        # Drain all 3 bells
        for _ in range(3):
            assert client.post(f"{API}/players/{pid}/spend-bells", json={"amount": 1}).status_code == 200
        r = client.post(f"{API}/players/{pid}/spend-bells", json={"amount": 1})
        assert r.status_code == 400
        assert "Liberty Bells" in r.json().get("detail", "")

    def test_spend_bells_404(self, client):
        r = client.post(f"{API}/players/does-not-exist/spend-bells", json={"amount": 1})
        assert r.status_code == 404


class TestRevenueCatBells:
    @pytest.mark.parametrize("prod,expected", [
        ("bells_5", 5),
        ("bells_20", 20),
        ("bells_50", 50),
    ])
    def test_webhook_grants_bells(self, client, prod, expected):
        p = client.post(f"{API}/players", json={"username": f"TEST_RCB_{prod}"}).json()
        pid, base_bells = p["id"], p["bells"]
        payload = {"event": {
            "type": "NON_RENEWING_PURCHASE",
            "app_user_id": pid,
            "product_id": prod,
            "transaction_id": f"TXNB_{_uuid.uuid4()}",
            "id": f"EIDB_{_uuid.uuid4()}",
            "store": "APP_STORE",
            "environment": "SANDBOX",
        }}
        r = client.post(f"{API}/revenuecat/webhook", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["granted"] == expected and body["currency"] == "bells"
        after = client.get(f"{API}/players/{pid}").json()
        assert after["bells"] == base_bells + expected
        # coins unchanged
        assert after["coins"] == p["coins"]

    def test_webhook_bells_duplicate_idempotent(self, client):
        p = client.post(f"{API}/players", json={"username": "TEST_RCB_Dup"}).json()
        pid, base = p["id"], p["bells"]
        txn = f"TXNB_{_uuid.uuid4()}"
        payload = {"event": {
            "type": "NON_RENEWING_PURCHASE",
            "app_user_id": pid,
            "product_id": "bells_20",
            "transaction_id": txn,
            "id": f"EIDB_{_uuid.uuid4()}",
        }}
        r1 = client.post(f"{API}/revenuecat/webhook", json=payload)
        assert r1.status_code == 200
        assert client.get(f"{API}/players/{pid}").json()["bells"] == base + 20
        # duplicate: no double grant
        r2 = client.post(f"{API}/revenuecat/webhook", json=payload)
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True
        assert client.get(f"{API}/players/{pid}").json()["bells"] == base + 20



# ---------- Iteration 8: Daily Reward + Level Stars ----------
DAILY_REWARDS_EXPECTED = [
    {"coins": 25, "bells": 0},
    {"coins": 40, "bells": 0},
    {"coins": 60, "bells": 1},
    {"coins": 80, "bells": 0},
    {"coins": 100, "bells": 1},
    {"coins": 120, "bells": 0},
    {"coins": 150, "bells": 2},
]


class TestDailyReward:
    def test_new_player_daily_reward_status_shape(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_DailyNew"}).json()["id"]
        r = client.get(f"{API}/players/{pid}/daily-reward")
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(["claimable", "streak", "next_streak", "reward", "cycle"]).issubset(d)
        assert d["claimable"] is True
        assert d["streak"] == 0
        assert d["next_streak"] == 1
        assert d["reward"]["day"] == 1
        assert d["reward"]["coins"] == 25 and d["reward"]["bells"] == 0
        # 7-item cycle matches server constant
        assert d["cycle"] == DAILY_REWARDS_EXPECTED

    def test_claim_grants_coins_bells_and_increments_streak(self, client):
        p = client.post(f"{API}/players", json={"username": "TEST_DailyClaim"}).json()
        pid = p["id"]
        base_coins, base_bells = p["coins"], p["bells"]
        r = client.post(f"{API}/players/{pid}/claim-daily-reward")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["streak"] == 1
        assert body["reward"] == {"coins": 25, "bells": 0, "day": 1}
        pl = body["player"]
        assert pl["coins"] == base_coins + 25
        assert pl["bells"] == base_bells + 0
        assert pl["daily_streak"] == 1
        assert pl["last_reward_date"] is not None
        # GET verifies persistence
        g = client.get(f"{API}/players/{pid}").json()
        assert g["coins"] == base_coins + 25
        assert g["daily_streak"] == 1

    def test_second_claim_same_day_returns_400(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_DailyTwice"}).json()["id"]
        r1 = client.post(f"{API}/players/{pid}/claim-daily-reward")
        assert r1.status_code == 200, r1.text
        # Status after claim: not claimable
        s = client.get(f"{API}/players/{pid}/daily-reward").json()
        assert s["claimable"] is False
        assert s["streak"] == 1
        # Second claim same UTC-day rejected
        r2 = client.post(f"{API}/players/{pid}/claim-daily-reward")
        assert r2.status_code == 400
        assert "Already" in r2.json().get("detail", "") or "already" in r2.json().get("detail", "")

    def test_daily_reward_404(self, client):
        r1 = client.get(f"{API}/players/does-not-exist/daily-reward")
        assert r1.status_code == 404
        r2 = client.post(f"{API}/players/does-not-exist/claim-daily-reward")
        assert r2.status_code == 404


class TestLevelStars:
    def test_complete_level_stores_stars_and_keeps_best(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_Stars"}).json()["id"]
        # First attempt at level 1: 2 stars
        r = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "soft_pretzel", "score": 100,
            "coins_earned": 10, "completed": True, "stars": 2,
        })
        assert r.status_code == 200, r.text
        assert r.json()["stars"] == {"1": 2}
        g = client.get(f"{API}/players/{pid}").json()
        assert g["stars"] == {"1": 2}

        # Re-do level 1 with 3 stars -> upgrades to 3
        r2 = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "soft_pretzel", "score": 120,
            "coins_earned": 10, "completed": True, "stars": 3,
        })
        assert r2.json()["stars"] == {"1": 3}

        # Re-do level 1 with 1 star -> should NOT downgrade
        r3 = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "soft_pretzel", "score": 50,
            "coins_earned": 5, "completed": True, "stars": 1,
        })
        assert r3.json()["stars"] == {"1": 3}

        # Complete level 2 with 2 stars -> dict now has both
        r4 = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 2, "dish_id": "happy_cakes", "score": 200,
            "coins_earned": 15, "completed": True, "stars": 2,
        })
        stars = r4.json()["stars"]
        assert stars["1"] == 3 and stars["2"] == 2

    def test_stars_zero_not_stored(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_StarsZero"}).json()["id"]
        r = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "soft_pretzel", "score": 10,
            "coins_earned": 1, "completed": True, "stars": 0,
        })
        assert r.status_code == 200
        # No key for level 1 since stars <= 0
        assert r.json()["stars"] == {}

    def test_stars_ignored_when_not_completed(self, client):
        pid = client.post(f"{API}/players", json={"username": "TEST_StarsFail"}).json()["id"]
        r = client.post(f"{API}/players/{pid}/complete-level", json={
            "level": 1, "dish_id": "soft_pretzel", "score": 10,
            "coins_earned": 1, "completed": False, "stars": 3,
        })
        assert r.status_code == 200
        assert r.json()["stars"] == {}

    def test_new_player_stars_default_empty(self, client):
        p = client.post(f"{API}/players", json={"username": "TEST_StarsNew"}).json()
        assert p["stars"] == {}
        assert p["daily_streak"] == 0
        assert p["last_reward_date"] is None
