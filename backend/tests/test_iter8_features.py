"""Iteration 8 tests: affirmation-day gating (Day 1 or Monday) with carriedAffirmation.

The Affirmation step (Page 4) should only be presented on Day 1 and every Monday.
On other days it carries over from the most-recent non-empty affirmation.
Inspirational Quote (Page 7) still appears every day (verified via content payload).
"""
import os
import uuid
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or open("/app/frontend/.env").read().split("EXPO_PUBLIC_BACKEND_URL=")[1].split("\n")[0].strip().strip('"')


def _uid():
    return f"TEST_i8_{uuid.uuid4().hex[:10]}"


def _empty_entry():
    return {
        "morningRitual": ["", "", ""],
        "weeklyGoals": ["", "", "", "", ""],
        "blessings": ["", "", ""],
        "affirmationSelected": "",
        "affirmationCustom": "",
        "workouts": [],
        "mood": "",
        "photos": [],
        "dailyGoals": ["", "", "", "", ""],
        "actionsYesterday": ["", "", "", "", ""],
        "accomplishedYesterday": None,
        "accomplishedCount": "",
        "actionsTomorrow": ["", "", "", "", ""],
        "tomorrowNotes": ["", "", ""],
        "journal": "",
        "weekly": {"wentWell": "", "improve": "", "learned": ""},
    }


class TestAffirmationDay:
    """Verify affirmationDay flag is true only on Day 1 or Mondays."""

    def test_day1_is_affirmation_day(self):
        uid = _uid()
        # init sets signupDate=today; today is Day 1
        r = requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        assert r.status_code == 200
        today = r.json()["today"]
        d = requests.get(f"{BASE_URL}/api/day/{today}", params={"userId": uid}).json()
        assert d["dayNumber"] == 1
        assert d["affirmationDay"] is True
        # Quote content is always populated
        assert d["content"]["quote"]["text"]

    def test_monday_is_affirmation_day_non_day1(self):
        # 2026-09-07 is a Monday
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        d = requests.get(f"{BASE_URL}/api/day/2026-09-07", params={"userId": uid}).json()
        assert d["affirmationDay"] is True

    def test_tuesday_not_affirmation_day(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        d = requests.get(f"{BASE_URL}/api/day/2026-09-08", params={"userId": uid}).json()
        assert d["affirmationDay"] is False
        # Quote still present every day
        assert d["content"]["quote"]["text"]

    def test_saturday_not_affirmation_day(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        d = requests.get(f"{BASE_URL}/api/day/2026-09-12", params={"userId": uid}).json()
        assert d["affirmationDay"] is False


class TestCarriedAffirmation:
    """Set affirmation on Monday, verify it carries to later days."""

    def test_carry_from_monday(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        # Seed Monday 2026-09-07 affirmationSelected
        entry = _empty_entry()
        entry["affirmationSelected"] = "I am strong and steady"
        r = requests.put(f"{BASE_URL}/api/day/2026-09-07", params={"userId": uid}, json=entry)
        assert r.status_code == 200

        # Tue 09-08 → affirmationDay=false, carriedAffirmation is Monday's
        tue = requests.get(f"{BASE_URL}/api/day/2026-09-08", params={"userId": uid}).json()
        assert tue["affirmationDay"] is False
        assert tue["carriedAffirmation"] == "I am strong and steady"

        # Sat 09-12 → also carries
        sat = requests.get(f"{BASE_URL}/api/day/2026-09-12", params={"userId": uid}).json()
        assert sat["affirmationDay"] is False
        assert sat["carriedAffirmation"] == "I am strong and steady"

    def test_custom_affirmation_takes_precedence(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        entry = _empty_entry()
        entry["affirmationSelected"] = "picked one"
        entry["affirmationCustom"] = "my custom mantra"
        requests.put(f"{BASE_URL}/api/day/2026-09-07", params={"userId": uid}, json=entry)
        tue = requests.get(f"{BASE_URL}/api/day/2026-09-08", params={"userId": uid}).json()
        assert tue["carriedAffirmation"] == "my custom mantra"

    def test_no_affirmation_history_returns_empty(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        d = requests.get(f"{BASE_URL}/api/day/2026-09-08", params={"userId": uid}).json()
        assert d["affirmationDay"] is False
        assert d["carriedAffirmation"] == ""


class TestQuoteAlwaysPresent:
    """Quote (Page 7) is NEVER gated — present on every day including non-affirmation days."""

    def test_quote_on_affirmation_day(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        d = requests.get(f"{BASE_URL}/api/day/2026-09-07", params={"userId": uid}).json()
        assert d["affirmationDay"] is True
        assert d["content"]["quote"]["text"].strip() != ""
        assert isinstance(d["content"]["affirmations"], list)
        assert len(d["content"]["affirmations"]) == 3

    def test_quote_on_non_affirmation_day(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        d = requests.get(f"{BASE_URL}/api/day/2026-09-08", params={"userId": uid}).json()
        assert d["affirmationDay"] is False
        # Quote must still be populated on non-affirmation days
        assert d["content"]["quote"]["text"].strip() != ""


class TestRegression:
    """Regressions from earlier iterations."""

    def test_calendar_streak_fields(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        r = requests.get(f"{BASE_URL}/api/calendar", params={"userId": uid})
        assert r.status_code == 200
        body = r.json()
        for k in ("days", "loginDates", "totalEntries", "currentStreak", "longestStreak", "restDayAvailable"):
            assert k in body, f"missing {k}"

    def test_gratitude_wall_still_works(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        entry = _empty_entry()
        entry["blessings"] = ["family", "coffee", ""]
        requests.put(f"{BASE_URL}/api/day/2026-09-05", params={"userId": uid}, json=entry)
        r = requests.get(f"{BASE_URL}/api/gratitude-wall", params={"userId": uid}).json()
        assert r["total"] == 2
        assert {i["text"] for i in r["items"]} == {"family", "coffee"}

    def test_put_persists_affirmation(self):
        uid = _uid()
        requests.post(f"{BASE_URL}/api/init", json={"userId": uid})
        entry = _empty_entry()
        entry["affirmationSelected"] = "carry me"
        requests.put(f"{BASE_URL}/api/day/2026-09-07", params={"userId": uid}, json=entry)
        got = requests.get(f"{BASE_URL}/api/day/2026-09-07", params={"userId": uid}).json()
        assert got["entry"]["affirmationSelected"] == "carry me"
