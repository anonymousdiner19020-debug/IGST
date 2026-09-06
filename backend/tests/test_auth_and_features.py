"""Backend tests for iteration 2 features:
- Auth: register / login / me / logout / session(google 401)
- Anonymous -> account data migration
- Mood persistence + insights.moodBreakdown + calendar.mood
- Workouts as array (multi-select) + insights.workoutBreakdown + search
- Weekly recap Sunday-Saturday window + fields
- Data endpoints work with Bearer AND userId query
"""
import uuid
from datetime import datetime, timezone, timedelta


TEST_PASS = "secret123"


def _register(api, base_url, email=None, device_id=None):
    # Backend lowercases emails, so keep the test email lowercase already
    email = email or f"test_{uuid.uuid4().hex[:10]}@aura.com"
    body = {"email": email, "password": TEST_PASS, "name": "Tester"}
    if device_id:
        body["deviceUserId"] = device_id
    r = api.post(f"{base_url}/api/auth/register", json=body)
    return r, email


class TestAuth:
    def test_01_register_returns_token_and_user(self, api, base_url):
        r, email = _register(api, base_url)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("session_token")
        assert data["user"]["email"] == email
        assert data["user"]["user_id"].startswith("user_")

    def test_02_duplicate_register_returns_409(self, api, base_url):
        r1, email = _register(api, base_url)
        assert r1.status_code == 200
        r2 = api.post(f"{base_url}/api/auth/register",
                      json={"email": email, "password": TEST_PASS})
        assert r2.status_code == 409, r2.text

    def test_03_login_success_and_wrong_password(self, api, base_url):
        r1, email = _register(api, base_url)
        assert r1.status_code == 200
        # correct password
        ok = api.post(f"{base_url}/api/auth/login",
                      json={"email": email, "password": TEST_PASS})
        assert ok.status_code == 200
        assert ok.json().get("session_token")
        # wrong password
        bad = api.post(f"{base_url}/api/auth/login",
                       json={"email": email, "password": "wrong-pass"})
        assert bad.status_code == 401
        # non-existent user still 401
        nf = api.post(f"{base_url}/api/auth/login",
                      json={"email": f"nope_{uuid.uuid4().hex[:6]}@aura.com",
                            "password": "whatever"})
        assert nf.status_code == 401

    def test_04_me_and_logout(self, api, base_url):
        r, email = _register(api, base_url)
        token = r.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        me = api.get(f"{base_url}/api/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["user"]["email"] == email
        # missing token
        assert api.get(f"{base_url}/api/auth/me").status_code == 401
        # invalid token
        assert api.get(f"{base_url}/api/auth/me",
                       headers={"Authorization": "Bearer garbage"}).status_code == 401
        # logout invalidates
        out = api.post(f"{base_url}/api/auth/logout", headers=headers)
        assert out.status_code == 200
        assert api.get(f"{base_url}/api/auth/me", headers=headers).status_code == 401

    def test_05_google_session_invalid_returns_401(self, api, base_url):
        r = api.post(f"{base_url}/api/auth/session",
                     json={"session_id": "invalid-session-id-xxxx"})
        assert r.status_code == 401


class TestMigrationAndDataDualAuth:
    def test_06_anonymous_to_account_migration(self, api, base_url):
        device = f"TEST_dev_{uuid.uuid4().hex[:8]}"
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        # 1) anonymous entry
        payload = {
            "morningRitual": ["", "", ""],
            "weeklyGoals": ["", "", "", "", ""],
            "blessings": ["", "", ""],
            "affirmationSelected": "", "affirmationCustom": "",
            "workouts": ["Cardio", "Weights"],
            "mood": "4",
            "dailyGoals": ["ship migration TEST_MIGRATE", "", "", "", ""],
            "actionsYesterday": ["", "", "", "", ""],
            "accomplishedYesterday": None, "accomplishedCount": "",
            "actionsTomorrow": ["", "", "", "", ""],
            "tomorrowNotes": ["", "", ""],
            "journal": "hello TEST_MIGRATE",
            "weekly": {"wentWell": "", "improve": "", "learned": ""},
        }
        r = api.put(f"{base_url}/api/day/{today}",
                    params={"userId": device}, json=payload)
        assert r.status_code == 200

        # register with same email prefixed with TEST_ to keep test data identifiable
        email = f"test_mig_{uuid.uuid4().hex[:8]}@aura.com"
        # (kept as-is)
        rr = api.post(f"{base_url}/api/auth/register",
                      json={"email": email, "password": TEST_PASS,
                            "deviceUserId": device})
        assert rr.status_code == 200
        token = rr.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3) calendar via Bearer must include the migrated day
        cal = api.get(f"{base_url}/api/calendar", headers=headers).json()
        dates = {d["date"] for d in cal["days"]}
        assert today in dates, f"migrated day missing: {cal}"
        day = next(d for d in cal["days"] if d["date"] == today)
        assert day["mood"] == "4"
        assert day["completed"] is True

        # 4) anon userId shouldn't return the migrated entry anymore
        old = api.get(f"{base_url}/api/calendar",
                      params={"userId": device}).json()
        assert not any(d["date"] == today and d["completed"]
                       for d in old["days"])

    def test_07_data_endpoints_dual_auth(self, api, base_url):
        # Register a fresh account
        r, _email = _register(api, base_url)
        token = r.json()["session_token"]
        uid = r.json()["user"]["user_id"]
        headers = {"Authorization": f"Bearer {token}"}
        # /api/day (Bearer)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        d1 = api.get(f"{base_url}/api/day/{today}", headers=headers)
        assert d1.status_code == 200
        # /api/day (userId query, using account id)
        d2 = api.get(f"{base_url}/api/day/{today}", params={"userId": uid})
        assert d2.status_code == 200
        # /api/calendar, /api/search, /api/insights, /api/weekly-recap
        for path in ("/api/calendar", "/api/insights", "/api/weekly-recap"):
            a = api.get(f"{base_url}{path}", headers=headers)
            b = api.get(f"{base_url}{path}", params={"userId": uid})
            assert a.status_code == 200, f"{path} bearer -> {a.status_code}"
            assert b.status_code == 200, f"{path} userId  -> {b.status_code}"
        s1 = api.get(f"{base_url}/api/search",
                     headers=headers, params={"q": "hello"})
        s2 = api.get(f"{base_url}/api/search",
                     params={"userId": uid, "q": "hello"})
        assert s1.status_code == 200 and s2.status_code == 200

    def test_08_missing_identifier_returns_400(self, api, base_url):
        r = api.get(f"{base_url}/api/calendar")
        assert r.status_code == 400


class TestMoodWorkoutsRecap:
    def test_09_mood_persistence_and_breakdown(self, api, base_url):
        r, _ = _register(api, base_url)
        token = r.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        payload = {"morningRitual": ["", "", ""],
                   "weeklyGoals": ["", "", "", "", ""],
                   "blessings": ["", "", ""],
                   "affirmationSelected": "", "affirmationCustom": "",
                   "workouts": [], "mood": "4",
                   "dailyGoals": ["", "", "", "", ""],
                   "actionsYesterday": ["", "", "", "", ""],
                   "accomplishedYesterday": None, "accomplishedCount": "",
                   "actionsTomorrow": ["", "", "", "", ""],
                   "tomorrowNotes": ["", "", ""], "journal": "",
                   "weekly": {"wentWell": "", "improve": "", "learned": ""}}
            
        put = api.put(f"{base_url}/api/day/{today}",
                      headers=headers, json=payload)
        assert put.status_code == 200
        assert put.json()["entry"]["mood"] == "4"
        # GET returns mood
        got = api.get(f"{base_url}/api/day/{today}", headers=headers).json()
        assert got["entry"]["mood"] == "4"
        # insights.moodBreakdown reflects
        ins = api.get(f"{base_url}/api/insights", headers=headers).json()
        assert ins["moodBreakdown"].get("4") == 1
        # calendar day includes mood
        cal = api.get(f"{base_url}/api/calendar", headers=headers).json()
        day = next(d for d in cal["days"] if d["date"] == today)
        assert day["mood"] == "4"

    def test_10_workouts_multi_persist_and_search(self, api, base_url):
        r, _ = _register(api, base_url)
        token = r.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        payload = {"morningRitual": ["", "", ""],
                   "weeklyGoals": ["", "", "", "", ""],
                   "blessings": ["", "", ""],
                   "affirmationSelected": "", "affirmationCustom": "",
                   "workouts": ["Cardio", "Weights"], "mood": "",
                   "dailyGoals": ["", "", "", "", ""],
                   "actionsYesterday": ["", "", "", "", ""],
                   "accomplishedYesterday": None, "accomplishedCount": "",
                   "actionsTomorrow": ["", "", "", "", ""],
                   "tomorrowNotes": ["", "", ""], "journal": "",
                   "weekly": {"wentWell": "", "improve": "", "learned": ""}}
        put = api.put(f"{base_url}/api/day/{today}",
                      headers=headers, json=payload)
        assert put.status_code == 200
        entry = put.json()["entry"]
        assert entry["workouts"] == ["Cardio", "Weights"]
        # insights workoutBreakdown counts both
        ins = api.get(f"{base_url}/api/insights", headers=headers).json()
        wb = ins["workoutBreakdown"]
        assert wb.get("Cardio") == 1 and wb.get("Weights") == 1
        # search finds 'weights' on page 5 (Workout)
        sr = api.get(f"{base_url}/api/search",
                     headers=headers, params={"q": "weights"}).json()
        assert sr["results"], "search should find weights"
        pages = {m["page"] for res in sr["results"] for m in res["matches"]}
        assert 5 in pages

    def test_11_weekly_recap_sunday_window_and_fields(self, api, base_url):
        r, _ = _register(api, base_url)
        token = r.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        today_d = datetime.now(timezone.utc).date()
        today = today_d.strftime("%Y-%m-%d")
        # write an entry with wins + mood
        # First GET /api/day to trigger AI content caching (needed for highlightQuote)
        api.get(f"{base_url}/api/day/{today}", headers=headers)
        payload = {"morningRitual": ["", "", ""],
                   "weeklyGoals": ["", "", "", "", ""],
                   "blessings": ["", "", ""],
                   "affirmationSelected": "", "affirmationCustom": "",
                   "workouts": [], "mood": "3",
                   "dailyGoals": ["win1 TEST_WIN", "", "", "", ""],
                   "actionsYesterday": ["", "", "", "", ""],
                   "accomplishedYesterday": None, "accomplishedCount": "",
                   "actionsTomorrow": ["", "", "", "", ""],
                   "tomorrowNotes": ["", "", ""], "journal": "",
                   "weekly": {"wentWell": "went well TEST_WW",
                              "improve": "", "learned": ""}}
        api.put(f"{base_url}/api/day/{today}",
                headers=headers, json=payload)
        recap = api.get(f"{base_url}/api/weekly-recap",
                        headers=headers).json()
        # Sunday-Saturday window: startDate must be a Sunday
        start = datetime.strptime(recap["startDate"], "%Y-%m-%d").date()
        # Python weekday(): Mon=0..Sun=6
        assert start.weekday() == 6, f"startDate not Sunday: {start}"
        # 7-day window
        end = datetime.strptime(recap["endDate"], "%Y-%m-%d").date()
        assert (end - start).days == 6
        assert len(recap["moodsByDay"]) == 7
        assert recap["entriesCount"] >= 1
        # mood in counts
        assert recap["moodCounts"].get("3") == 1
        # wins captured
        wins = recap["wins"]
        assert any("TEST_WIN" in w for w in wins)
        assert any("TEST_WW" in w for w in wins)
        # highlight quote
        assert recap.get("highlightQuote")
        assert "currentStreak" in recap
