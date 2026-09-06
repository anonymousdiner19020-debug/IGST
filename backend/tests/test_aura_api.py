"""Aura backend API tests - covers init, day CRUD, calendar, search, insights, AI caching.

NOTE: pytest-xdist is running with `--dist loadscope`, which splits classes across
workers. Because tests depend on a shared user_id and mongo state, all
data-dependent tests are consolidated into a single class so they run on one
worker in a deterministic order.
"""
import uuid
from datetime import datetime, timezone, timedelta


class TestHealth:
    def test_root(self, api, base_url):
        r = api.get(f"{base_url}/api/")
        assert r.status_code == 200
        assert r.json().get("message") == "Aura API"


class TestUserIsolation:
    def test_new_user_sees_empty_calendar(self, api, base_url):
        uid = f"TEST_iso_{uuid.uuid4().hex[:8]}"
        api.post(f"{base_url}/api/init", json={"userId": uid})
        cal = api.get(f"{base_url}/api/calendar", params={"userId": uid}).json()
        assert cal["totalEntries"] == 0
        assert cal["days"] == []
        assert cal["currentStreak"] >= 1  # signed-in today


class TestAuraFullFlow:
    """Full flow using one user_id: init -> get day -> AI caching -> save
    -> calendar -> search -> insights -> future day isSpecial logic.
    Must live in one class so xdist loadscope keeps them on the same worker."""

    def test_01_init(self, api, base_url, user_id):
        r = api.post(f"{base_url}/api/init", json={"userId": user_id})
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("userId", "signupDate", "today", "dayNumber", "isSpecial",
                  "loginDays", "currentStreak", "longestStreak"):
            assert k in data, f"missing {k}"
        assert data["userId"] == user_id
        assert data["dayNumber"] == 1
        assert data["isSpecial"] is True
        assert data["currentStreak"] >= 1

    def test_02_init_idempotent(self, api, base_url, user_id):
        r1 = api.post(f"{base_url}/api/init", json={"userId": user_id}).json()
        r2 = api.post(f"{base_url}/api/init", json={"userId": user_id}).json()
        assert r1["signupDate"] == r2["signupDate"]

    def test_03_get_day_returns_ai_content(self, api, base_url, user_id):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = api.get(f"{base_url}/api/day/{today}", params={"userId": user_id})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["date"] == today
        assert data["dayNumber"] == 1
        assert data["isSpecial"] is True
        content = data["content"]
        assert isinstance(content["affirmations"], list) and len(content["affirmations"]) == 3
        assert all(isinstance(a, str) and a for a in content["affirmations"])
        assert content["quote"].get("text")
        assert data["hasContent"] is False

    def test_04_ai_content_cached(self, api, base_url, user_id):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        a = api.get(f"{base_url}/api/day/{today}", params={"userId": user_id}).json()
        b = api.get(f"{base_url}/api/day/{today}", params={"userId": user_id}).json()
        assert a["content"]["affirmations"] == b["content"]["affirmations"]
        assert a["content"]["quote"] == b["content"]["quote"]

    def test_05_put_day_persists_all_fields(self, api, base_url, user_id):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        payload = {
            "morningRitual": ["read 10 pages", "meditate", "cold shower"],
            "weeklyGoals": ["ship MVP", "run 3x", "call mom", "", ""],
            "blessings": ["health", "family", "coffee"],
            "affirmationSelected": "I am becoming stronger every day.",
            "affirmationCustom": "",
            "workout": "Cardio",
            "dailyGoals": ["standup", "PR review", "gym", "", ""],
            "actionsYesterday": ["shipped feature", "", "", "", ""],
            "accomplishedYesterday": True,
            "accomplishedCount": "All",
            "actionsTomorrow": ["deploy", "docs", "", "", ""],
            "tomorrowNotes": ["focus AM", "", ""],
            "journal": "Feeling good about the sprint TEST_journal_marker",
            "weekly": {"wentWell": "team sync", "improve": "planning", "learned": "async is powerful"},
        }
        r = api.put(f"{base_url}/api/day/{today}", params={"userId": user_id}, json=payload)
        assert r.status_code == 200, r.text
        saved = r.json()["entry"]
        assert saved["morningRitual"] == payload["morningRitual"]
        assert saved["workout"] == "Cardio"
        assert saved["accomplishedYesterday"] is True
        assert saved["weekly"]["wentWell"] == "team sync"
        assert saved["dayNumber"] == 1
        assert saved["isSpecial"] is True

        # verify via GET
        got = api.get(f"{base_url}/api/day/{today}", params={"userId": user_id}).json()
        assert got["entry"]["journal"].startswith("Feeling good")
        assert got["hasContent"] is True

    def test_06_calendar_reflects_saved_entry(self, api, base_url, user_id):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = api.get(f"{base_url}/api/calendar", params={"userId": user_id})
        assert r.status_code == 200
        data = r.json()
        for k in ("days", "loginDates", "totalEntries", "loginDays",
                  "currentStreak", "longestStreak"):
            assert k in data
        matched = [d for d in data["days"] if d["date"] == today]
        assert matched, "today should appear in calendar"
        assert matched[0]["completed"] is True
        assert matched[0]["isSpecial"] is True
        assert today in data["loginDates"]

    def test_07_search_finds_journal(self, api, base_url, user_id):
        r = api.get(f"{base_url}/api/search",
                    params={"userId": user_id, "q": "TEST_journal_marker"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert len(results) >= 1
        pages = {m["page"] for res in results for m in res["matches"]}
        assert 10 in pages, "journal (page 10) should match"

    def test_08_search_finds_workout_and_goals(self, api, base_url, user_id):
        r = api.get(f"{base_url}/api/search", params={"userId": user_id, "q": "cardio"}).json()
        assert r["results"], "cardio search should find match"
        pages = {m["page"] for res in r["results"] for m in res["matches"]}
        assert 5 in pages, "workout (page 5) should match"

        r2 = api.get(f"{base_url}/api/search", params={"userId": user_id, "q": "standup"}).json()
        pages2 = {m["page"] for res in r2["results"] for m in res["matches"]}
        assert 6 in pages2, "daily goals (page 6) should match"

    def test_09_search_empty_q(self, api, base_url, user_id):
        r = api.get(f"{base_url}/api/search", params={"userId": user_id, "q": ""}).json()
        assert r == {"results": []}

    def test_10_insights_shape(self, api, base_url, user_id):
        r = api.get(f"{base_url}/api/insights", params={"userId": user_id})
        assert r.status_code == 200
        data = r.json()
        for k in ("signupDate", "dayNumber", "totalEntries", "workoutBreakdown",
                  "loginDays", "currentStreak", "longestStreak"):
            assert k in data
        assert data["totalEntries"] >= 1
        assert data["workoutBreakdown"].get("Cardio") == 1

    def test_11_future_day_7_is_special(self, api, base_url, user_id):
        future = (datetime.now(timezone.utc).date() + timedelta(days=6)).strftime("%Y-%m-%d")
        r = api.get(f"{base_url}/api/day/{future}", params={"userId": user_id}).json()
        assert r["dayNumber"] == 7
        assert r["isSpecial"] is True

    def test_12_day_2_not_special(self, api, base_url, user_id):
        future = (datetime.now(timezone.utc).date() + timedelta(days=1)).strftime("%Y-%m-%d")
        r = api.get(f"{base_url}/api/day/{future}", params={"userId": user_id}).json()
        assert r["dayNumber"] == 2
        assert r["isSpecial"] is False
