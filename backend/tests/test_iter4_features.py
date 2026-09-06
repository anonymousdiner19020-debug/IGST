"""Backend tests for iteration 4 features:
- GET /api/mood-trend
- GET /api/on-this-day (with snippet preference + signupDate boundary)
- Regression: existing endpoints still work
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import requests
from pymongo import MongoClient


TEST_PASS = "secret123"


def _empty_payload(**over):
    p = {"morningRitual": ["", "", ""],
         "weeklyGoals": ["", "", "", "", ""],
         "blessings": ["", "", ""],
         "affirmationSelected": "", "affirmationCustom": "",
         "workouts": [], "mood": "",
         "photos": [],
         "dailyGoals": ["", "", "", "", ""],
         "actionsYesterday": ["", "", "", "", ""],
         "accomplishedYesterday": None, "accomplishedCount": "",
         "actionsTomorrow": ["", "", "", "", ""],
         "tomorrowNotes": ["", "", ""], "journal": "",
         "weekly": {"wentWell": "", "improve": "", "learned": ""}}
    p.update(over)
    return p


def _tid():
    return f"TEST_i4_{uuid.uuid4().hex[:12]}"


def _mongo():
    def _read_env(path):
        d = {}
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        d[k.strip()] = v.strip().strip('"').strip("'")
        except FileNotFoundError:
            pass
        return d
    env = _read_env("/app/backend/.env")
    url = os.environ.get("MONGO_URL") or env.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or env.get("DB_NAME")
    return MongoClient(url)[db_name]


# ---------- MOOD TREND ----------
class TestMoodTrend:
    def test_defaults_length_and_shape(self, api, base_url):
        uid = _tid()
        r = api.get(f"{base_url}/api/mood-trend", params={"userId": uid})
        assert r.status_code == 200, r.text
        j = r.json()
        assert len(j["days"]) == 30
        assert j["count"] == 0
        assert j["average"] == 0
        assert j["startDate"] and j["endDate"]
        assert all("date" in d and "mood" in d for d in j["days"])

    def test_clamped_to_7_min(self, api, base_url):
        uid = _tid()
        r = api.get(f"{base_url}/api/mood-trend",
                    params={"userId": uid, "days": 3})
        assert r.status_code == 200
        assert len(r.json()["days"]) == 7

    def test_clamped_to_90_max(self, api, base_url):
        uid = _tid()
        r = api.get(f"{base_url}/api/mood-trend",
                    params={"userId": uid, "days": 200})
        assert r.status_code == 200
        assert len(r.json()["days"]) == 90

    def test_average_reflects_saved_moods(self, api, base_url):
        uid = _tid()
        today = datetime.now(timezone.utc).date()
        # save mood=5 today, mood=3 yesterday
        for offset, mood in ((0, "5"), (1, "3")):
            d = (today - timedelta(days=offset)).strftime("%Y-%m-%d")
            p = _empty_payload(mood=mood)
            r = api.put(f"{base_url}/api/day/{d}", params={"userId": uid}, json=p)
            assert r.status_code == 200, r.text
        r = api.get(f"{base_url}/api/mood-trend",
                    params={"userId": uid, "days": 30})
        j = r.json()
        assert j["count"] == 2
        assert j["average"] == 4.0
        moods_by_date = {d["date"]: d["mood"] for d in j["days"]}
        assert moods_by_date[today.strftime("%Y-%m-%d")] == "5"


# ---------- ON THIS DAY ----------
class TestOnThisDay:
    def test_not_found_when_no_entries(self, api, base_url):
        uid = _tid()
        r = api.get(f"{base_url}/api/on-this-day", params={"userId": uid})
        assert r.status_code == 200
        assert r.json() == {"found": False}

    def test_not_found_when_candidate_before_signup(self, api, base_url):
        """Fresh profile => signupDate == today; 7 days ago is before signup."""
        uid = _tid()
        # trigger profile creation
        api.post(f"{base_url}/api/init", json={"userId": uid})
        # save an entry 7 days ago (backdated) with content
        today = datetime.now(timezone.utc).date()
        past = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        p = _empty_payload(mood="4", journal="old thought")
        r = api.put(f"{base_url}/api/day/{past}", params={"userId": uid}, json=p)
        assert r.status_code == 200
        r = api.get(f"{base_url}/api/on-this-day", params={"userId": uid})
        assert r.status_code == 200
        # signup was today, so 7d-ago (< signup) must NOT be surfaced
        assert r.json() == {"found": False}

    def test_found_after_backdated_signup_snippet_from_journal(self, api, base_url):
        uid = _tid()
        api.post(f"{base_url}/api/init", json={"userId": uid})
        today = datetime.now(timezone.utc).date()
        # backdate signupDate to 60 days ago via direct Mongo write
        db = _mongo()
        db.profiles.update_one(
            {"userId": uid},
            {"$set": {"signupDate": (today - timedelta(days=60))
                      .strftime("%Y-%m-%d")}})
        past7 = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        p = _empty_payload(mood="5", journal="I felt amazing today  ")
        r = api.put(f"{base_url}/api/day/{past7}", params={"userId": uid}, json=p)
        assert r.status_code == 200
        r = api.get(f"{base_url}/api/on-this-day", params={"userId": uid})
        j = r.json()
        assert j["found"] is True
        assert j["date"] == past7
        assert j["weeksAgo"] == 1
        assert j["mood"] == "5"
        assert j["snippet"] == "I felt amazing today"
        assert "dayNumber" in j

    def test_snippet_fallbacks_to_blessing(self, api, base_url):
        uid = _tid()
        api.post(f"{base_url}/api/init", json={"userId": uid})
        today = datetime.now(timezone.utc).date()
        db = _mongo()
        db.profiles.update_one(
            {"userId": uid},
            {"$set": {"signupDate": (today - timedelta(days=60))
                      .strftime("%Y-%m-%d")}})
        past14 = (today - timedelta(days=14)).strftime("%Y-%m-%d")
        p = _empty_payload(
            blessings=["family", "", ""],
            dailyGoals=["laterGoal", "", "", "", ""])
        r = api.put(f"{base_url}/api/day/{past14}", params={"userId": uid}, json=p)
        assert r.status_code == 200
        r = api.get(f"{base_url}/api/on-this-day", params={"userId": uid})
        j = r.json()
        assert j["found"] is True
        assert j["weeksAgo"] == 2
        assert j["snippet"] == "family"  # first non-empty blessing

    def test_nearest_week_wins(self, api, base_url):
        uid = _tid()
        api.post(f"{base_url}/api/init", json={"userId": uid})
        today = datetime.now(timezone.utc).date()
        db = _mongo()
        db.profiles.update_one(
            {"userId": uid},
            {"$set": {"signupDate": (today - timedelta(days=60))
                      .strftime("%Y-%m-%d")}})
        # write BOTH 7-day-ago and 21-day-ago; nearest (7) should win
        for weeks, txt in ((3, "three-weeks"), (1, "one-week")):
            d = (today - timedelta(days=7 * weeks)).strftime("%Y-%m-%d")
            r = api.put(f"{base_url}/api/day/{d}",
                        params={"userId": uid},
                        json=_empty_payload(journal=txt, mood="4"))
            assert r.status_code == 200
        j = api.get(f"{base_url}/api/on-this-day",
                    params={"userId": uid}).json()
        assert j["found"] is True
        assert j["weeksAgo"] == 1
        assert j["snippet"] == "one-week"


# ---------- REGRESSION ----------
class TestRegression:
    def test_today_calendar_search_insights_weekly_recap(self, api, base_url):
        uid = _tid()
        # today
        r = api.post(f"{base_url}/api/init", json={"userId": uid})
        assert r.status_code == 200
        assert "signupDate" in r.json() and "today" in r.json()
        # save day with mood + workouts + photos
        today = datetime.now(timezone.utc).date().strftime("%Y-%m-%d")
        payload = _empty_payload(
            mood="5",
            workouts=["run 30m"],
            photos=["some/path.png"],
            journal="hello",
            blessings=["gratitude", "", ""])
        r = api.put(f"{base_url}/api/day/{today}", params={"userId": uid}, json=payload)
        assert r.status_code == 200
        # GET day
        r = api.get(f"{base_url}/api/day/{today}", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()["entry"]
        assert j["mood"] == "5"
        assert j["photos"] == ["some/path.png"]
        assert j["workouts"] and j["workouts"][0] == "run 30m"
        # calendar
        yyyy_mm = today[:7]
        r = api.get(f"{base_url}/api/calendar",
                    params={"month": yyyy_mm, "userId": uid})
        assert r.status_code == 200
        # search
        r = api.get(f"{base_url}/api/search",
                    params={"q": "hello", "userId": uid})
        assert r.status_code == 200
        # insights
        r = api.get(f"{base_url}/api/insights",
                    params={"userId": uid, "days": 30})
        assert r.status_code == 200
        # weekly recap
        r = api.get(f"{base_url}/api/weekly-recap",
                    params={"userId": uid})
        assert r.status_code == 200
        rj = r.json()
        assert "bestDay" in rj
        assert "moodsByDay" in rj
