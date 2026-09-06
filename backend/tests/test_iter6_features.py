"""Backend tests for iteration 6 features:
- compute_streak monthly rest day (one missed day per calendar month is forgiven).
- restDayAvailable flag exposed via /init, /calendar, /insights.
- longestStreak stays strict-consecutive (unaffected by freeze).
- /search page 9 label updated to "Today's Actions".
- /gratitude-trends still returns top blessings (used by Today's recurring card).
Server clock: today = 2026-09-06 (Sunday, per environment fixture).
Logins for streak scenarios are seeded via POST /api/init (records today's login)
and by inserting synthetic prior-day logins through PUT /api/day WITH a manual
logins insert via a helper endpoint. Since there is no such endpoint we drive
the login collection directly through pymongo using the backend's MONGO_URL.
"""
import os
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient
import pytest


# ---- Backend Mongo connection (read-only helper for seeding logins) ----
def _read_env(path):
    data = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                data[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return data


_env = _read_env("/app/backend/.env")
MONGO_URL = os.environ.get("MONGO_URL") or _env.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or _env.get("DB_NAME")


@pytest.fixture(scope="module")
def mongo():
    assert MONGO_URL and DB_NAME, "MONGO_URL/DB_NAME required"
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


def _tid():
    return f"TEST_i6_{uuid.uuid4().hex[:10]}"


def _seed_logins(mongo, uid, dates):
    """Insert logins directly into db.logins for a fresh user."""
    now = datetime.now(timezone.utc).isoformat()
    mongo.logins.delete_many({"userId": uid})
    if dates:
        mongo.logins.insert_many(
            [{"userId": uid, "date": d, "at": now} for d in dates]
        )


# -------------------- STREAK FREEZE --------------------
class TestStreakFreeze:
    """Server clock is 2026-09-06 (Sunday)."""

    def test_freeze_covers_single_gap_in_month(self, api, base_url, mongo):
        """Logins on 09-06, 09-05, 09-03, 09-02 (09-04 missing).
        current=4, restDayAvailable=false (used)."""
        uid = _tid()
        _seed_logins(mongo, uid, ["2026-09-06", "2026-09-05", "2026-09-03", "2026-09-02"])
        r = api.get(f"{base_url}/api/calendar", params={"userId": uid})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["currentStreak"] == 4, j
        assert j["restDayAvailable"] is False
        # longestStreak = strict consecutive → best run is 2 (09-05,09-06 OR 09-02,09-03)
        assert j["longestStreak"] == 2, j

        # /insights returns same streak fields
        r = api.get(f"{base_url}/api/insights", params={"userId": uid})
        assert r.status_code == 200
        j2 = r.json()
        assert j2["currentStreak"] == 4
        assert j2["restDayAvailable"] is False
        assert j2["longestStreak"] == 2

    def test_two_missed_days_break_streak(self, api, base_url, mongo):
        """Logins on 09-06, 09-05, 09-02 (both 09-04 AND 09-03 missing).
        Freeze covers the FIRST gap-day (09-04), then 09-03 is a second miss
        in the same month → streak stops. current=2."""
        uid = _tid()
        _seed_logins(mongo, uid, ["2026-09-06", "2026-09-05", "2026-09-02"])
        r = api.get(f"{base_url}/api/calendar", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["currentStreak"] == 2, j
        assert j["restDayAvailable"] is False, j  # freeze was spent

    def test_no_gaps_freeze_unused(self, api, base_url, mongo):
        """Logins on 09-06, 09-05, 09-04 (consecutive).
        current=3, restDayAvailable=true (freeze unused)."""
        uid = _tid()
        _seed_logins(mongo, uid, ["2026-09-06", "2026-09-05", "2026-09-04"])
        r = api.get(f"{base_url}/api/calendar", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["currentStreak"] == 3, j
        assert j["restDayAvailable"] is True, j
        assert j["longestStreak"] == 3

    def test_init_returns_rest_day_available(self, api, base_url, mongo):
        """POST /api/init records today's login then reports restDayAvailable."""
        uid = _tid()
        _seed_logins(mongo, uid, [])
        r = api.post(f"{base_url}/api/init", json={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert "restDayAvailable" in j
        assert j["currentStreak"] == 1
        assert j["restDayAvailable"] is True

    def test_longest_streak_strict_consecutive(self, api, base_url, mongo):
        """Longest streak ignores the monthly rest day.
        Logins: 09-01, 09-02, 09-03, 09-05, 09-06. Longest strict run = 3."""
        uid = _tid()
        _seed_logins(mongo, uid, [
            "2026-09-01", "2026-09-02", "2026-09-03",
            "2026-09-05", "2026-09-06",
        ])
        r = api.get(f"{base_url}/api/calendar", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["longestStreak"] == 3, j
        # currentStreak walks back with freeze on 09-04 → 5
        assert j["currentStreak"] == 5, j
        assert j["restDayAvailable"] is False

    def test_freeze_stops_at_earliest_login(self, api, base_url, mongo):
        """When cursor goes below earliest login, we stop (don't count phantom days).
        Only login on 09-06 → currentStreak=1, restDayAvailable=true (freeze unused)."""
        uid = _tid()
        _seed_logins(mongo, uid, ["2026-09-06"])
        r = api.get(f"{base_url}/api/calendar", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["currentStreak"] == 1
        assert j["restDayAvailable"] is True


# -------------------- WEEKLY-RECAP EXPOSES currentStreak --------------------
class TestWeeklyRecapStreak:
    def test_weekly_recap_currentStreak(self, api, base_url, mongo):
        uid = _tid()
        _seed_logins(mongo, uid, ["2026-09-06", "2026-09-05", "2026-09-04"])
        r = api.get(f"{base_url}/api/weekly-recap", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["currentStreak"] == 3


# -------------------- SEARCH page 9 = Today's Actions --------------------
class TestSearchPage9Label:
    def test_page9_label_is_todays_actions(self, api, base_url):
        uid = _tid()
        # payload with an actionsTomorrow value (page 9) containing 'jog'
        payload = {
            "morningRitual": ["", "", ""],
            "weeklyGoals": ["", "", "", "", ""],
            "blessings": ["", "", ""],
            "affirmationSelected": "", "affirmationCustom": "",
            "workouts": [], "mood": "", "photos": [],
            "dailyGoals": ["", "", "", "", ""],
            "actionsYesterday": ["", "", "", "", ""],
            "accomplishedYesterday": None, "accomplishedCount": "",
            "actionsTomorrow": ["morning jog", "", "", "", ""],
            "tomorrowNotes": ["", "", ""], "journal": "",
            "weekly": {"wentWell": "", "improve": "", "learned": ""},
        }
        r = api.put(f"{base_url}/api/day/2026-09-06",
                    params={"userId": uid}, json=payload)
        assert r.status_code == 200
        r = api.get(f"{base_url}/api/search",
                    params={"userId": uid, "q": "jog", "pages": "9"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert len(results) >= 1
        # find the page-9 match and check label wording
        labels = {m["label"] for e in results for m in e["matches"] if m["page"] == 9}
        assert "Today's Actions" in labels, labels
        # ensure the old "Tomorrow's Actions" wording is gone
        assert "Tomorrow's Actions" not in labels


# -------------------- GRATITUDE TRENDS (top blessing for Today card) --------
class TestGratitudeTopBlessing:
    def test_top_blessing_repeats_ge_2(self, api, base_url):
        uid = _tid()
        # save "family time" on two dates
        for d in ("2026-09-06", "2026-09-05"):
            payload = {
                "morningRitual": ["", "", ""],
                "weeklyGoals": ["", "", "", "", ""],
                "blessings": ["family time", "", ""],
                "affirmationSelected": "", "affirmationCustom": "",
                "workouts": [], "mood": "", "photos": [],
                "dailyGoals": ["", "", "", "", ""],
                "actionsYesterday": ["", "", "", "", ""],
                "accomplishedYesterday": None, "accomplishedCount": "",
                "actionsTomorrow": ["", "", "", "", ""],
                "tomorrowNotes": ["", "", ""], "journal": "",
                "weekly": {"wentWell": "", "improve": "", "learned": ""},
            }
            r = api.put(f"{base_url}/api/day/{d}",
                        params={"userId": uid}, json=payload)
            assert r.status_code == 200
        r = api.get(f"{base_url}/api/gratitude-trends",
                    params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["blessings"][0]["text"] == "family time"
        assert j["blessings"][0]["count"] == 2
