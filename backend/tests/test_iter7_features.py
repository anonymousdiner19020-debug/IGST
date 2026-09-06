"""Backend tests for iteration 7 features:
- GET /api/gratitude-wall returns all non-empty blessings across every entry
  as {items:[{date,text}], total} sorted by date desc.
- Empty case returns {items:[], total:0}.
- Regressions: /api/gratitude-trends, /api/day, /api/calendar, /api/search, auth.
"""
import uuid
import pytest


def _tid():
    return f"TEST_i7_{uuid.uuid4().hex[:10]}"


def _payload(blessings=None, journal="", actions_tomorrow=None):
    return {
        "morningRitual": ["", "", ""],
        "weeklyGoals": ["", "", "", "", ""],
        "blessings": blessings or ["", "", ""],
        "affirmationSelected": "", "affirmationCustom": "",
        "workouts": [], "mood": "", "photos": [],
        "dailyGoals": ["", "", "", "", ""],
        "actionsYesterday": ["", "", "", "", ""],
        "accomplishedYesterday": None, "accomplishedCount": "",
        "actionsTomorrow": actions_tomorrow or ["", "", "", "", ""],
        "tomorrowNotes": ["", "", ""],
        "journal": journal,
        "weekly": {"wentWell": "", "improve": "", "learned": ""},
    }


# -------------------- GRATITUDE WALL --------------------
class TestGratitudeWall:
    def test_wall_returns_all_blessings_newest_first(self, api, base_url):
        uid = _tid()
        # 2026-09-05: two non-empty blessings + one empty (should skip empties)
        r = api.put(f"{base_url}/api/day/2026-09-05",
                    params={"userId": uid},
                    json=_payload(blessings=["sunshine", "coffee", ""]))
        assert r.status_code == 200, r.text
        # 2026-09-06: two non-empty blessings
        r = api.put(f"{base_url}/api/day/2026-09-06",
                    params={"userId": uid},
                    json=_payload(blessings=["family time", "quiet morning", ""]))
        assert r.status_code == 200, r.text

        r = api.get(f"{base_url}/api/gratitude-wall", params={"userId": uid})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "items" in j and "total" in j
        assert j["total"] == 4, j
        assert len(j["items"]) == 4
        # newest first: 09-06 items must precede 09-05
        dates = [it["date"] for it in j["items"]]
        assert dates[0] == "2026-09-06"
        assert dates[1] == "2026-09-06"
        assert dates[2] == "2026-09-05"
        assert dates[3] == "2026-09-05"
        # texts present and non-empty
        texts_9_6 = {it["text"] for it in j["items"] if it["date"] == "2026-09-06"}
        assert texts_9_6 == {"family time", "quiet morning"}
        texts_9_5 = {it["text"] for it in j["items"] if it["date"] == "2026-09-05"}
        assert texts_9_5 == {"sunshine", "coffee"}
        # each item is {date,text} only
        for it in j["items"]:
            assert set(it.keys()) == {"date", "text"}
            assert it["text"].strip() == it["text"] and it["text"] != ""

    def test_wall_empty_for_user_with_no_blessings(self, api, base_url):
        uid = _tid()
        r = api.get(f"{base_url}/api/gratitude-wall", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j == {"items": [], "total": 0}

    def test_wall_ignores_entries_with_only_empty_blessings(self, api, base_url):
        uid = _tid()
        # journal-only entry — no blessings should surface
        r = api.put(f"{base_url}/api/day/2026-09-06",
                    params={"userId": uid},
                    json=_payload(journal="a day"))
        assert r.status_code == 200
        r = api.get(f"{base_url}/api/gratitude-wall", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["total"] == 0
        assert j["items"] == []

    def test_wall_missing_user_id_returns_400(self, api, base_url):
        r = api.get(f"{base_url}/api/gratitude-wall")
        assert r.status_code == 400


# -------------------- REGRESSIONS --------------------
class TestRegressions:
    def test_gratitude_trends_still_works(self, api, base_url):
        uid = _tid()
        for d in ("2026-09-06", "2026-09-05"):
            r = api.put(f"{base_url}/api/day/{d}",
                        params={"userId": uid},
                        json=_payload(blessings=["family time", "", ""]))
            assert r.status_code == 200
        r = api.get(f"{base_url}/api/gratitude-trends", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["blessings"][0]["text"] == "family time"
        assert j["blessings"][0]["count"] == 2

    def test_day_get_and_put(self, api, base_url):
        uid = _tid()
        r = api.get(f"{base_url}/api/day/2026-09-06", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert j["date"] == "2026-09-06"
        assert j["hasContent"] is False
        r = api.put(f"{base_url}/api/day/2026-09-06",
                    params={"userId": uid},
                    json=_payload(journal="hello"))
        assert r.status_code == 200
        r = api.get(f"{base_url}/api/day/2026-09-06", params={"userId": uid})
        assert r.status_code == 200
        assert r.json()["entry"]["journal"] == "hello"
        assert r.json()["hasContent"] is True

    def test_calendar(self, api, base_url):
        uid = _tid()
        r = api.put(f"{base_url}/api/day/2026-09-06",
                    params={"userId": uid},
                    json=_payload(blessings=["a", "", ""]))
        assert r.status_code == 200
        r = api.get(f"{base_url}/api/calendar", params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert "days" in j and "currentStreak" in j and "restDayAvailable" in j
        assert any(d["date"] == "2026-09-06" and d["completed"] for d in j["days"])

    def test_search(self, api, base_url):
        uid = _tid()
        r = api.put(f"{base_url}/api/day/2026-09-06",
                    params={"userId": uid},
                    json=_payload(blessings=["sunshine", "", ""], journal="Grateful today"))
        assert r.status_code == 200
        r = api.get(f"{base_url}/api/search", params={"userId": uid, "q": "grateful"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert len(results) >= 1
        assert any(m["page"] == 10 for e in results for m in e["matches"])

    def test_auth_register_login(self, api, base_url):
        email = f"iter7_{uuid.uuid4().hex[:8]}@test.com"
        r = api.post(f"{base_url}/api/auth/register",
                     json={"email": email, "password": "secret123", "name": "T7"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "session_token" in j and "user" in j
        r = api.post(f"{base_url}/api/auth/login",
                     json={"email": email, "password": "secret123"})
        assert r.status_code == 200
        token = r.json()["session_token"]
        r = api.get(f"{base_url}/api/auth/me",
                    headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == email
