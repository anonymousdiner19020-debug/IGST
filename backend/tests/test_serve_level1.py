"""Regression tests for the Level 1 serve flow endpoints.

The user reported "an error when serving on level one" for Soft Pretzel. This
suite validates every backend endpoint that serve.tsx calls during and after a
Level 1 serve round to make sure none of them 5xx or 4xx unexpectedly.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def player_id():
    r = requests.post(f"{BASE_URL}/api/players", json={"username": f"TEST_L1_{uuid.uuid4().hex[:6]}"})
    assert r.status_code == 200, r.text
    return r.json()["id"]


class TestServeLoadEndpoints:
    """Endpoints hit when the serve screen mounts."""

    def test_get_player(self, player_id):
        r = requests.get(f"{BASE_URL}/api/players/{player_id}")
        assert r.status_code == 200
        assert r.json().get("id") == player_id

    def test_pantry_info(self, player_id):
        r = requests.get(f"{BASE_URL}/api/pantry-info/{player_id}")
        assert r.status_code == 200
        data = r.json()
        assert "pantry" in data
        assert "pantry_level" in data


class TestServedFan:
    """POST /served-fan is called each time a Philly fan is served perfectly."""

    @pytest.mark.parametrize("code", ["eagles", "phillies", "flyers", "sixers"])
    def test_served_fan(self, player_id, code):
        r = requests.post(f"{BASE_URL}/api/players/{player_id}/served-fan", json={"team": code})
        assert r.status_code == 200


class TestFinishLevel:
    """POST /complete-level and /daily-goal-progress at end of serve round."""

    def test_complete_level_soft_pretzel(self, player_id):
        payload = {
            "level": 1,
            "dish_id": "soft_pretzel",
            "score": 3975,
            "coins_earned": 4005,
            "bells_earned": 30,
            "completed": True,
            "stars": 3,
        }
        r = requests.post(f"{BASE_URL}/api/players/{player_id}/complete-level", json=payload)
        assert r.status_code == 200, r.text
        # Verify persistence: coins added, stars saved, level unlocked
        p = requests.get(f"{BASE_URL}/api/players/{player_id}").json()
        assert p["coins"] >= 4005
        assert p["current_level"] >= 2
        stars = p.get("stars", {})
        assert stars.get("1") == 3 or stars.get(1) == 3

    def test_daily_goal_progress(self, player_id):
        payload = {
            "special_served": 2,
            "customers_served": 10,
            "perfect_serves": 10,
            "levels_completed": 1,
            "fans_served": 3,
        }
        r = requests.post(f"{BASE_URL}/api/players/{player_id}/daily-goal-progress", json=payload)
        assert r.status_code == 200, r.text


class TestEdgeCases:
    def test_complete_level_unknown_player(self):
        r = requests.post(
            f"{BASE_URL}/api/players/does-not-exist-xyz/complete-level",
            json={"level": 1, "dish_id": "soft_pretzel", "score": 0, "coins_earned": 0, "bells_earned": 0, "completed": False, "stars": 0},
        )
        # Should be a clean 404, not 500
        assert r.status_code in (404, 400)

    def test_served_fan_bad_team(self, player_id):
        r = requests.post(f"{BASE_URL}/api/players/{player_id}/served-fan", json={"team": ""})
        assert r.status_code in (200, 400, 422)
