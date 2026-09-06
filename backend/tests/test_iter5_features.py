"""Backend tests for iteration 5 features:
- GET /api/search  with pages= filter and from/to date range
- GET /api/gratitude-trends
- GET /api/yearly-wrap
- Regression: previously-passing endpoints still respond correctly
"""
import uuid
from datetime import datetime, timedelta, timezone


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
    return f"TEST_i5_{uuid.uuid4().hex[:12]}"


# -------------------- SEARCH FILTERS --------------------
class TestSearchFilters:
    def _seed(self, api, base_url, uid):
        # today: journal + blessing containing 'peace'
        today = datetime.now(timezone.utc).date()
        d_today = today.strftime("%Y-%m-%d")
        d_yesterday = (today - timedelta(days=1)).strftime("%Y-%m-%d")
        d_old = (today - timedelta(days=45)).strftime("%Y-%m-%d")
        p = _empty_payload(journal="peace within the storm",
                           blessings=["peace at home", "", ""])
        r = api.put(f"{base_url}/api/day/{d_today}",
                    params={"userId": uid}, json=p)
        assert r.status_code == 200, r.text
        # yesterday: only blessing with 'peace'
        p2 = _empty_payload(blessings=["peace at work", "", ""])
        r = api.put(f"{base_url}/api/day/{d_yesterday}",
                    params={"userId": uid}, json=p2)
        assert r.status_code == 200
        # 45 days ago: only journal with 'peace' (for date-range filtering)
        p3 = _empty_payload(journal="old peace memory")
        r = api.put(f"{base_url}/api/day/{d_old}",
                    params={"userId": uid}, json=p3)
        assert r.status_code == 200
        return d_today, d_yesterday, d_old

    def test_pages_10_only_journal(self, api, base_url):
        uid = _tid()
        d_today, d_yesterday, _ = self._seed(api, base_url, uid)
        r = api.get(f"{base_url}/api/search",
                    params={"userId": uid, "q": "peace", "pages": "10"})
        assert r.status_code == 200
        results = r.json()["results"]
        # only journal matches should appear
        pages_seen = {m["page"] for entry in results for m in entry["matches"]}
        assert pages_seen == {10}, pages_seen
        dates = {e["date"] for e in results}
        # yesterday had only a blessing (page 3) so it must NOT appear
        assert d_yesterday not in dates
        # today's journal matches
        assert d_today in dates

    def test_pages_3_only_blessings(self, api, base_url):
        uid = _tid()
        d_today, d_yesterday, _ = self._seed(api, base_url, uid)
        r = api.get(f"{base_url}/api/search",
                    params={"userId": uid, "q": "peace", "pages": "3"})
        assert r.status_code == 200
        results = r.json()["results"]
        pages_seen = {m["page"] for entry in results for m in entry["matches"]}
        assert pages_seen == {3}, pages_seen
        # both today and yesterday should appear (both have blessings)
        dates = {e["date"] for e in results}
        assert d_today in dates
        assert d_yesterday in dates

    def test_no_pages_returns_all_matches(self, api, base_url):
        uid = _tid()
        self._seed(api, base_url, uid)
        r = api.get(f"{base_url}/api/search",
                    params={"userId": uid, "q": "peace"})
        assert r.status_code == 200
        results = r.json()["results"]
        pages_seen = {m["page"] for entry in results for m in entry["matches"]}
        # journal (10) + blessings (3) both present
        assert 10 in pages_seen and 3 in pages_seen

    def test_from_to_limits_date_range(self, api, base_url):
        uid = _tid()
        d_today, d_yesterday, d_old = self._seed(api, base_url, uid)
        # only last 7 days
        today = datetime.now(timezone.utc).date()
        seven_ago = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        r = api.get(f"{base_url}/api/search",
                    params={"userId": uid, "q": "peace",
                            "from": seven_ago, "to": d_today})
        assert r.status_code == 200
        dates = {e["date"] for e in r.json()["results"]}
        assert d_old not in dates
        assert d_today in dates and d_yesterday in dates


# -------------------- GRATITUDE TRENDS --------------------
class TestGratitudeTrends:
    def test_shape_and_repeat_threshold(self, api, base_url):
        uid = _tid()
        today = datetime.now(timezone.utc).date()
        # save "My family" on 3 different dates + "peace" on 2 different dates,
        # and "solo blessing" only once (should NOT appear)
        for offset, bl, gl in (
            (0, "My family", "run 5k"),
            (2, "My family", "run 5k"),
            (4, "My family", "read book"),
            (6, "peace of mind", "run 5k"),
            (8, "peace of mind", ""),
            (10, "solo blessing", "one-time-goal"),
        ):
            d = (today - timedelta(days=offset)).strftime("%Y-%m-%d")
            p = _empty_payload(blessings=[bl, "", ""],
                               dailyGoals=[gl, "", "", "", ""])
            r = api.put(f"{base_url}/api/day/{d}",
                        params={"userId": uid}, json=p)
            assert r.status_code == 200, r.text
        r = api.get(f"{base_url}/api/gratitude-trends",
                    params={"userId": uid})
        assert r.status_code == 200
        j = r.json()
        assert set(j.keys()) == {"blessings", "goals"}
        # blessings: "My family" (3), "peace of mind" (2); "solo blessing" excluded
        bl_map = {b["text"]: b["count"] for b in j["blessings"]}
        assert bl_map.get("My family") == 3
        assert bl_map.get("peace of mind") == 2
        assert "solo blessing" not in bl_map
        # sorted desc
        counts = [b["count"] for b in j["blessings"]]
        assert counts == sorted(counts, reverse=True)
        # goals: "run 5k" (3); "read book" once → excluded
        gl_map = {g["text"]: g["count"] for g in j["goals"]}
        assert gl_map.get("run 5k") == 3
        assert "read book" not in gl_map
        assert "one-time-goal" not in gl_map

    def test_empty_when_no_repeats(self, api, base_url):
        uid = _tid()
        # only one entry, so nothing repeats
        today = datetime.now(timezone.utc).date().strftime("%Y-%m-%d")
        r = api.put(f"{base_url}/api/day/{today}",
                    params={"userId": uid},
                    json=_empty_payload(blessings=["singular", "", ""]))
        assert r.status_code == 200
        j = api.get(f"{base_url}/api/gratitude-trends",
                    params={"userId": uid}).json()
        assert j == {"blessings": [], "goals": []}

    def test_max_six(self, api, base_url):
        uid = _tid()
        today = datetime.now(timezone.utc).date()
        # 8 different blessings each repeated exactly twice
        for i in range(8):
            for offset in (i * 2, i * 2 + 1):
                d = (today - timedelta(days=offset)).strftime("%Y-%m-%d")
                api.put(f"{base_url}/api/day/{d}",
                        params={"userId": uid},
                        json=_empty_payload(blessings=[f"bl{i}", "", ""]))
        j = api.get(f"{base_url}/api/gratitude-trends",
                    params={"userId": uid}).json()
        assert len(j["blessings"]) == 6


# -------------------- YEARLY WRAP --------------------
class TestYearlyWrap:
    def test_shape_and_values(self, api, base_url):
        uid = _tid()
        api.post(f"{base_url}/api/init", json={"userId": uid})
        # write 3 entries in 2025 across 2 months, mixed moods/workouts/photos
        payloads = [
            ("2025-03-05", _empty_payload(mood="5",
                                          workouts=["run"],
                                          photos=["a.png", "b.png"],
                                          dailyGoals=["ship v1", "", "", "", ""],
                                          journal="great")),
            ("2025-03-12", _empty_payload(mood="3",
                                          workouts=["yoga"],
                                          photos=["c.png"],
                                          dailyGoals=["ship v1", "", "", "", ""],
                                          weekly={"wentWell": "focus",
                                                  "improve": "",
                                                  "learned": ""})),
            ("2025-07-04", _empty_payload(mood="4",
                                          workouts=["run"],
                                          photos=[],
                                          journal="summer")),
        ]
        for d, p in payloads:
            r = api.put(f"{base_url}/api/day/{d}",
                        params={"userId": uid}, json=p)
            assert r.status_code == 200
        # unrelated 2024 entry must be excluded
        api.put(f"{base_url}/api/day/2024-05-05",
                params={"userId": uid},
                json=_empty_payload(mood="1", journal="prev year"))
        r = api.get(f"{base_url}/api/yearly-wrap",
                    params={"userId": uid, "year": 2025})
        assert r.status_code == 200
        j = r.json()
        expected_keys = {"year", "entriesCount", "daysLoggedIn", "avgMood",
                         "moodCounts", "workoutBreakdown", "photos",
                         "bestMonth", "topWins", "longestStreak",
                         "currentStreak"}
        assert expected_keys.issubset(j.keys()), j.keys()
        assert j["year"] == 2025
        assert j["entriesCount"] == 3
        assert j["photos"] == 3  # 2 + 1 + 0
        assert j["avgMood"] == 4.0  # (5+3+4)/3 = 4.0
        assert j["moodCounts"] == {"5": 1, "3": 1, "4": 1}
        assert j["workoutBreakdown"] == {"run": 2, "yoga": 1}
        # 2025-03 has 2 entries → best month
        assert j["bestMonth"] == "2025-03"
        # topWins: "ship v1" appears twice, "focus" once → sorted by freq
        assert j["topWins"][0] == "ship v1"

    def test_defaults_to_current_year(self, api, base_url):
        uid = _tid()
        r = api.get(f"{base_url}/api/yearly-wrap", params={"userId": uid})
        assert r.status_code == 200
        assert r.json()["year"] == datetime.now(timezone.utc).year


# -------------------- REGRESSION --------------------
class TestRegression:
    def test_core_endpoints(self, api, base_url):
        uid = _tid()
        r = api.post(f"{base_url}/api/init", json={"userId": uid})
        assert r.status_code == 200 and "signupDate" in r.json()
        today = datetime.now(timezone.utc).date().strftime("%Y-%m-%d")
        r = api.put(f"{base_url}/api/day/{today}",
                    params={"userId": uid},
                    json=_empty_payload(mood="5",
                                        workouts=["run 30m"],
                                        photos=["some/path.png"],
                                        journal="hello",
                                        blessings=["gratitude", "", ""]))
        assert r.status_code == 200
        j = api.get(f"{base_url}/api/day/{today}",
                    params={"userId": uid}).json()["entry"]
        assert j["mood"] == "5" and j["photos"] == ["some/path.png"]
        for path in ("/api/calendar", "/api/insights",
                     "/api/weekly-recap", "/api/mood-trend",
                     "/api/on-this-day"):
            r = api.get(f"{base_url}{path}", params={"userId": uid})
            assert r.status_code == 200, f"{path} => {r.status_code}"
        # search regression (no filters)
        r = api.get(f"{base_url}/api/search",
                    params={"userId": uid, "q": "hello"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert any(m["page"] == 10 for e in results for m in e["matches"])

    def test_auth_register_login(self, api, base_url):
        email = f"test_i5_{uuid.uuid4().hex[:8]}@aura.com"
        r = api.post(f"{base_url}/api/auth/register",
                     json={"email": email, "password": "secret123"})
        assert r.status_code == 200, r.text
        assert "session_token" in r.json()
        r = api.post(f"{base_url}/api/auth/login",
                     json={"email": email, "password": "secret123"})
        assert r.status_code == 200
        tok = r.json()["session_token"]
        me = api.get(f"{base_url}/api/auth/me",
                     headers={"Authorization": f"Bearer {tok}"})
        assert me.status_code == 200
        body = me.json()
        # /me may return the user directly OR wrapped as {user: {...}}
        user = body.get("user", body)
        assert user.get("email") == email, body
