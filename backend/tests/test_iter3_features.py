"""Backend tests for iteration 3 features:
- POST /api/upload + GET /api/files/{path}
- Journal photos on day entry
- Change / set / delete password
- /api/auth/me hasPassword
- Weekly recap bestDay + moodsByDay
"""
import io
import uuid
import requests
from datetime import datetime, timezone


TEST_PASS = "secret123"


def _upload(base_url, token, filename="test.png", data=None):
    """Upload bypassing shared session (which forces Content-Type=json)."""
    return requests.post(
        f"{base_url}/api/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (filename, io.BytesIO(data or PNG_BYTES), "image/png")},
        timeout=30,
    )


def _register(api, base_url):
    email = f"test_i3_{uuid.uuid4().hex[:10]}@aura.com"
    r = api.post(f"{base_url}/api/auth/register",
                 json={"email": email, "password": TEST_PASS, "name": "T"})
    assert r.status_code == 200, r.text
    j = r.json()
    return email, j["session_token"], j["user"]["user_id"]


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


# 1x1 PNG bytes
PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
)


class TestUploadAndFiles:
    def test_upload_returns_path_and_files_serves_it(self, api, base_url):
        _e, tok, uid = _register(api, base_url)
        headers = {"Authorization": f"Bearer {tok}"}
        # multipart upload (avoid shared session content-type)
        r = _upload(base_url, tok)
        assert r.status_code == 200, r.text
        path = r.json()["path"]
        assert path and "/uploads/" in path
        # GET /files with correct uid (query)
        g = api.get(f"{base_url}/api/files/{path}", params={"uid": uid})
        assert g.status_code == 200, g.text
        assert g.headers.get("content-type", "").startswith("image/")
        assert g.content == PNG_BYTES
        # wrong uid -> 404
        g2 = api.get(f"{base_url}/api/files/{path}",
                     params={"uid": "someone-else"})
        assert g2.status_code == 404
        # missing uid + no bearer -> 401
        g3 = api.get(f"{base_url}/api/files/{path}")
        assert g3.status_code == 401
        # bearer of another user -> 404
        _e2, tok2, _u2 = _register(api, base_url)
        g4 = api.get(f"{base_url}/api/files/{path}",
                     headers={"Authorization": f"Bearer {tok2}"})
        assert g4.status_code == 404


class TestDayPhotos:
    def test_photos_persist_and_mark_completed(self, api, base_url):
        _e, tok, _uid = _register(api, base_url)
        headers = {"Authorization": f"Bearer {tok}"}
        # upload a photo, get path
        up = _upload(base_url, tok, "p.png")
        assert up.status_code == 200
        path = up.json()["path"]
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        payload = _empty_payload(photos=[path])
        r = api.put(f"{base_url}/api/day/{today}", headers=headers,
                    json=payload)
        assert r.status_code == 200
        entry = r.json()["entry"]
        assert entry.get("photos") == [path]
        # GET returns it
        g = api.get(f"{base_url}/api/day/{today}", headers=headers).json()
        assert g["entry"]["photos"] == [path]
        # calendar day should be completed (photos count as content)
        cal = api.get(f"{base_url}/api/calendar", headers=headers).json()
        day = next(d for d in cal["days"] if d["date"] == today)
        assert day["completed"] is True


class TestPasswordAndDelete:
    def test_change_password_flow(self, api, base_url):
        _e, tok, _uid = _register(api, base_url)
        headers = {"Authorization": f"Bearer {tok}"}
        # too short new password -> 422
        r_short = api.post(f"{base_url}/api/auth/change-password",
                           headers=headers,
                           json={"current_password": TEST_PASS,
                                 "new_password": "abc"})
        assert r_short.status_code == 422
        # same as old -> 422
        r_same = api.post(f"{base_url}/api/auth/change-password",
                          headers=headers,
                          json={"current_password": TEST_PASS,
                                "new_password": TEST_PASS})
        assert r_same.status_code == 422
        # wrong current -> 401
        r_wrong = api.post(f"{base_url}/api/auth/change-password",
                           headers=headers,
                           json={"current_password": "not-it",
                                 "new_password": "brand-new-1"})
        assert r_wrong.status_code == 401
        # success
        r_ok = api.post(f"{base_url}/api/auth/change-password",
                        headers=headers,
                        json={"current_password": TEST_PASS,
                              "new_password": "brand-new-1"})
        assert r_ok.status_code == 200
        # current token still works
        assert api.get(f"{base_url}/api/auth/me",
                       headers=headers).status_code == 200
        # old password no longer works, new one does
        assert api.post(f"{base_url}/api/auth/login",
                        json={"email": _e,
                              "password": TEST_PASS}).status_code == 401
        assert api.post(f"{base_url}/api/auth/login",
                        json={"email": _e,
                              "password": "brand-new-1"}).status_code == 200

    def test_set_password_409_when_already_set(self, api, base_url):
        _e, tok, _uid = _register(api, base_url)
        headers = {"Authorization": f"Bearer {tok}"}
        r = api.post(f"{base_url}/api/auth/set-password",
                     headers=headers,
                     json={"new_password": "another-one-1"})
        assert r.status_code == 409

    def test_me_returns_has_password(self, api, base_url):
        _e, tok, _uid = _register(api, base_url)
        headers = {"Authorization": f"Bearer {tok}"}
        me = api.get(f"{base_url}/api/auth/me", headers=headers).json()
        assert "hasPassword" in me["user"]
        assert me["user"]["hasPassword"] is True

    def test_delete_account_flow(self, api, base_url):
        _e, tok, uid = _register(api, base_url)
        headers = {"Authorization": f"Bearer {tok}"}
        # write a day entry + upload to have artifacts
        up = _upload(base_url, tok, "p.png")
        path = up.json()["path"]
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        api.put(f"{base_url}/api/day/{today}", headers=headers,
                json=_empty_payload(photos=[path], journal="bye"))
        # wrong confirmation string -> 422
        r_conf = api.post(f"{base_url}/api/auth/delete", headers=headers,
                          json={"confirmation": "delete my account",
                                "current_password": TEST_PASS})
        assert r_conf.status_code == 422
        # wrong password -> 401
        r_pw = api.post(f"{base_url}/api/auth/delete", headers=headers,
                        json={"confirmation": "DELETE MY ACCOUNT",
                              "current_password": "nope"})
        assert r_pw.status_code == 401
        # success
        r_ok = api.post(f"{base_url}/api/auth/delete", headers=headers,
                        json={"confirmation": "DELETE MY ACCOUNT",
                              "current_password": TEST_PASS})
        assert r_ok.status_code == 200
        # token invalidated
        assert api.get(f"{base_url}/api/auth/me",
                       headers=headers).status_code == 401
        # login with old creds -> 401
        assert api.post(f"{base_url}/api/auth/login",
                        json={"email": _e,
                              "password": TEST_PASS}).status_code == 401
        # file no longer accessible (uploads erased)
        assert api.get(f"{base_url}/api/files/{path}",
                       params={"uid": uid}).status_code == 404


class TestWeeklyRecapExtras:
    def test_recap_best_day_and_moods_by_day(self, api, base_url):
        _e, tok, _uid = _register(api, base_url)
        headers = {"Authorization": f"Bearer {tok}"}
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        # Write mood 5 today
        api.put(f"{base_url}/api/day/{today}", headers=headers,
                json=_empty_payload(mood="5"))
        recap = api.get(f"{base_url}/api/weekly-recap",
                        headers=headers).json()
        assert len(recap["moodsByDay"]) == 7
        assert all("date" in d and "mood" in d for d in recap["moodsByDay"])
        assert recap.get("bestDay") is not None
        assert recap["bestDay"]["date"] == today
        assert recap["bestDay"]["mood"] == "5"
