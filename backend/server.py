from fastapi import FastAPI, APIRouter, Query, Header, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
import uuid
import secrets
import httpx
import requests
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date as date_cls, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
EMERGENT_OAUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ---- Object storage (managed) ----
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "aura"
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        return None
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 503:  # stale key: reset + retry once
        _storage_key = None
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
DUMMY_HASH = pwd.hash("timing-safe-dummy-password")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def parse_date(d: str) -> date_cls:
    return datetime.strptime(d, "%Y-%m-%d").date()


def day_number(signup: str, target: str) -> int:
    return (parse_date(target) - parse_date(signup)).days + 1


def is_special(day_no: int) -> bool:
    return day_no == 1 or (day_no > 0 and day_no % 7 == 0)


SEARCH_FIELDS = [
    ("morningRitual", 1, "Taking Control", "list"),
    ("blessings", 3, "Blessings", "list"),
    ("workouts", 5, "Workout", "list"),
    ("dailyGoals", 6, "Daily Goals", "list"),
    ("actionsYesterday", 8, "Yesterday's Actions", "list"),
    ("actionsTomorrow", 9, "Today's Actions", "list"),
    ("journal", 10, "Journal", "text"),
]


def empty_entry(user_id: str, d: str) -> Dict[str, Any]:
    return {
        "userId": user_id, "date": d,
        "morningRitual": ["", "", ""],
        "weeklyGoals": ["", "", "", "", ""],
        "blessings": ["", "", ""],
        "affirmationSelected": "", "affirmationCustom": "",
        "workouts": [], "mood": "", "photos": [],
        "dailyGoals": ["", "", "", "", ""],
        "actionsYesterday": ["", "", "", "", ""],
        "accomplishedYesterday": None, "accomplishedCount": "",
        "actionsTomorrow": ["", "", "", "", ""],
        "tomorrowNotes": ["", "", ""],
        "journal": "",
        "weekly": {"wentWell": "", "improve": "", "learned": ""},
    }


def entry_has_content(entry: Dict[str, Any]) -> bool:
    for key in ["morningRitual", "weeklyGoals", "blessings", "dailyGoals",
                "actionsYesterday", "actionsTomorrow", "tomorrowNotes"]:
        if any((v or "").strip() for v in entry.get(key, [])):
            return True
    if (entry.get("affirmationSelected") or entry.get("affirmationCustom") or "").strip():
        return True
    if [w for w in entry.get("workouts", []) if (w or "").strip()] or (entry.get("mood") or "").strip():
        return True
    if entry.get("photos"):
        return True
    if (entry.get("journal") or "").strip():
        return True
    w = entry.get("weekly") or {}
    if any((w.get(k) or "").strip() for k in ("wentWell", "improve", "learned")):
        return True
    if entry.get("accomplishedYesterday") is not None:
        return True
    return False


# --------------------------------------------------------------------------
# AI content
# --------------------------------------------------------------------------
FALLBACK_AFFIRMATIONS = [
    "I am becoming the person I choose to be.",
    "Every small step moves me forward.",
    "I have the power to shape my day.",
]
FALLBACK_QUOTE = {"text": "The secret of getting ahead is getting started.", "author": "Mark Twain"}


async def generate_daily_content(d: str) -> Dict[str, Any]:
    if not EMERGENT_LLM_KEY:
        return {"affirmations": FALLBACK_AFFIRMATIONS, "quote": FALLBACK_QUOTE}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY, session_id=f"daily-{d}",
            system_message=("You are a warm, grounded wellness coach who writes fresh, "
                            "non-cliche motivational content for a personal growth journal."),
        ).with_model("openai", "gpt-5.4-mini")
        prompt = (
            "Return ONLY valid JSON (no markdown) with keys: "
            "'affirmations' -> an array of exactly 3 short first-person, present-tense "
            "affirmations (4-10 words each, varied, uplifting) and "
            "'quote' -> an object with 'text' (a real inspirational quote, max 20 words) "
            f"and 'author'. Make the content feel fresh and specific for the date {d}. "
            "Avoid overused quotes."
        )
        resp = await chat.send_message(UserMessage(text=prompt))
        text = (resp if isinstance(resp, str) else str(resp)).strip()
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            text = m.group(0)
        data = json.loads(text)
        affirmations = [str(a).strip() for a in (data.get("affirmations") or []) if str(a).strip()][:3]
        if len(affirmations) < 3:
            affirmations = (affirmations + FALLBACK_AFFIRMATIONS)[:3]
        q = data.get("quote") or {}
        quote = {"text": str(q.get("text") or FALLBACK_QUOTE["text"]).strip(),
                 "author": str(q.get("author") or "").strip()}
        return {"affirmations": affirmations, "quote": quote}
    except Exception as e:  # noqa: BLE001
        logger.warning("AI generation failed: %s", e)
        return {"affirmations": FALLBACK_AFFIRMATIONS, "quote": FALLBACK_QUOTE}


async def get_or_create_content(user_id: str, d: str) -> Dict[str, Any]:
    existing = await db.daily_content.find_one({"userId": user_id, "date": d}, {"_id": 0})
    if existing:
        return {"affirmations": existing["affirmations"], "quote": existing["quote"]}
    content = await generate_daily_content(d)
    await db.daily_content.insert_one({"userId": user_id, "date": d, **content, "createdAt": now_iso()})
    return content


async def get_or_create_profile(user_id: str) -> Dict[str, Any]:
    profile = await db.profiles.find_one({"userId": user_id}, {"_id": 0})
    if not profile:
        profile = {"userId": user_id, "signupDate": today_str(), "createdAt": now_iso()}
        await db.profiles.insert_one(dict(profile))
    return profile


async def compute_streak(user_id: str) -> Dict[str, Any]:
    dates = await db.logins.distinct("date", {"userId": user_id})
    date_set = set(dates)
    login_days = len(date_set)
    sorted_dates = sorted(parse_date(x) for x in date_set)
    earliest = sorted_dates[0] if sorted_dates else None
    # Current streak with a monthly "rest day": one missed day per calendar
    # month is forgiven and won't break the streak.
    current = 0
    freezes_used: set = set()
    cursor = datetime.now(timezone.utc).date()
    while earliest is not None:
        ds = cursor.strftime("%Y-%m-%d")
        if ds in date_set:
            current += 1
        else:
            if cursor < earliest:
                break
            month = ds[:7]
            if month in freezes_used:
                break
            freezes_used.add(month)
        cursor = cursor - timedelta(days=1)
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    rest_day_available = current_month not in freezes_used
    longest, run, prev = 0, 0, None
    for dt in sorted_dates:
        run = run + 1 if (prev is not None and (dt - prev).days == 1) else 1
        longest = max(longest, run)
        prev = dt
    return {"loginDays": login_days, "currentStreak": current, "longestStreak": longest,
            "restDayAvailable": rest_day_available}


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
async def get_account_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    try:
        exp = datetime.fromisoformat(sess["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            return None
    except Exception:  # noqa: BLE001
        pass
    return sess["user_id"]


def require_id(account: Optional[str], user_id: Optional[str]) -> str:
    eid = account or user_id
    if not eid:
        raise HTTPException(400, "Missing user identifier")
    return eid


async def create_session(user_id: str, token: Optional[str] = None, days: int = 30) -> str:
    token = token or secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({
        "session_token": token, "user_id": user_id,
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=days)).isoformat(),
    })
    return token


def user_public(u: Dict[str, Any]) -> Dict[str, Any]:
    return {"user_id": u["user_id"], "email": u.get("email", ""),
            "name": u.get("name", ""), "picture": u.get("picture", ""),
            "hasPassword": bool(u.get("password_hash"))}


async def get_current_user(account: Optional[str] = Depends(get_account_id)) -> Dict[str, Any]:
    if not account:
        raise HTTPException(401, "Not authenticated")
    u = await db.users.find_one({"user_id": account})
    if not u:
        raise HTTPException(401, "Not authenticated")
    return u


async def migrate_anonymous(device_id: Optional[str], account_id: str):
    if not device_id or device_id == account_id:
        return
    for coll in (db.entries, db.daily_content, db.logins):
        acct_dates = set(await coll.distinct("date", {"userId": account_id}))
        async for doc in coll.find({"userId": device_id}):
            if doc.get("date") in acct_dates:
                await coll.delete_one({"_id": doc["_id"]})
            else:
                await coll.update_one({"_id": doc["_id"]}, {"$set": {"userId": account_id}})
    dev_p = await db.profiles.find_one({"userId": device_id})
    acct_p = await db.profiles.find_one({"userId": account_id})
    if dev_p:
        if not acct_p:
            await db.profiles.update_one({"userId": device_id}, {"$set": {"userId": account_id}})
        else:
            earliest = min(dev_p["signupDate"], acct_p["signupDate"])
            await db.profiles.update_one({"userId": account_id}, {"$set": {"signupDate": earliest}})
            await db.profiles.delete_one({"userId": device_id})
    await db.uploads.update_many({"userId": device_id}, {"$set": {"userId": account_id}})


# --------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------
class InitRequest(BaseModel):
    userId: str


class DayEntry(BaseModel):
    morningRitual: List[str] = Field(default_factory=lambda: ["", "", ""])
    weeklyGoals: List[str] = Field(default_factory=lambda: ["", "", "", "", ""])
    blessings: List[str] = Field(default_factory=lambda: ["", "", ""])
    affirmationSelected: str = ""
    affirmationCustom: str = ""
    workouts: List[str] = Field(default_factory=list)
    mood: str = ""
    photos: List[str] = Field(default_factory=list)
    dailyGoals: List[str] = Field(default_factory=lambda: ["", "", "", "", ""])
    actionsYesterday: List[str] = Field(default_factory=lambda: ["", "", "", "", ""])
    accomplishedYesterday: Optional[bool] = None
    accomplishedCount: str = ""
    actionsTomorrow: List[str] = Field(default_factory=lambda: ["", "", "", "", ""])
    tomorrowNotes: List[str] = Field(default_factory=lambda: ["", "", ""])
    journal: str = ""
    weekly: Dict[str, str] = Field(default_factory=lambda: {"wentWell": "", "improve": "", "learned": ""})


class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = ""
    deviceUserId: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str
    deviceUserId: Optional[str] = None


class SessionReq(BaseModel):
    session_id: str
    deviceUserId: Optional[str] = None


class ChangePasswordReq(BaseModel):
    current_password: str
    new_password: str


class SetPasswordReq(BaseModel):
    new_password: str


class DeleteAccountReq(BaseModel):
    confirmation: str
    current_password: Optional[str] = None


# --------------------------------------------------------------------------
# Auth routes
# --------------------------------------------------------------------------
@api_router.post("/auth/register")
async def register(req: RegisterReq):
    email = req.email.lower().strip()
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    existing = await db.users.find_one({"email": email})
    if existing and existing.get("password_hash"):
        raise HTTPException(409, "Email already registered")
    if existing:
        uid = existing["user_id"]
        await db.users.update_one({"user_id": uid},
                                  {"$set": {"password_hash": pwd.hash(req.password),
                                            "name": req.name or existing.get("name", "")}})
    else:
        uid = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({"user_id": uid, "email": email,
                                   "password_hash": pwd.hash(req.password),
                                   "name": req.name or "", "picture": "", "created_at": now_iso()})
    await migrate_anonymous(req.deviceUserId, uid)
    token = await create_session(uid)
    u = await db.users.find_one({"user_id": uid}, {"_id": 0})
    return {"session_token": token, "user": user_public(u)}


@api_router.post("/auth/login")
async def login(req: LoginReq):
    email = req.email.lower().strip()
    u = await db.users.find_one({"email": email})
    hashed = u["password_hash"] if (u and u.get("password_hash")) else DUMMY_HASH
    valid = pwd.verify(req.password, hashed)
    if not u or not u.get("password_hash") or not valid:
        raise HTTPException(401, "Invalid email or password")
    await migrate_anonymous(req.deviceUserId, u["user_id"])
    token = await create_session(u["user_id"])
    return {"session_token": token, "user": user_public(u)}


@api_router.post("/auth/session")
async def google_session(req: SessionReq):
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(EMERGENT_OAUTH_URL, headers={"X-Session-ID": req.session_id})
    except Exception:  # noqa: BLE001
        raise HTTPException(401, "Session exchange failed")
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session")
    data = r.json()
    email = (data.get("email") or "").lower().strip()
    name = data.get("name") or ""
    picture = data.get("picture") or ""
    session_token = data.get("session_token") or secrets.token_urlsafe(32)
    existing = await db.users.find_one({"email": email})
    if existing:
        uid = existing["user_id"]
        await db.users.update_one({"user_id": uid},
                                  {"$set": {"name": name or existing.get("name", ""),
                                            "picture": picture or existing.get("picture", "")}})
    else:
        uid = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({"user_id": uid, "email": email, "name": name,
                                   "picture": picture, "created_at": now_iso()})
    await migrate_anonymous(req.deviceUserId, uid)
    await create_session(uid, token=session_token, days=7)
    u = await db.users.find_one({"user_id": uid}, {"_id": 0})
    return {"session_token": session_token, "user": user_public(u)}


@api_router.get("/auth/me")
async def me(account: Optional[str] = Depends(get_account_id)):
    if not account:
        raise HTTPException(401, "Not authenticated")
    u = await db.users.find_one({"user_id": account}, {"_id": 0})
    if not u:
        raise HTTPException(401, "Not authenticated")
    return {"user": user_public(u)}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@api_router.post("/auth/change-password")
async def change_password(req: ChangePasswordReq, authorization: Optional[str] = Header(None),
                          user: Dict[str, Any] = Depends(get_current_user)):
    if not user.get("password_hash"):
        raise HTTPException(409, "No password set — use set-password to add one")
    if not pwd.verify(req.current_password, user["password_hash"]):
        raise HTTPException(401, "Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(422, "Password must be at least 6 characters")
    if pwd.verify(req.new_password, user["password_hash"]):
        raise HTTPException(422, "New password must be different")
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$set": {"password_hash": pwd.hash(req.new_password)}})
    cur = (authorization.split(" ", 1)[1].strip()
           if authorization and authorization.lower().startswith("bearer ") else None)
    q: Dict[str, Any] = {"user_id": user["user_id"]}
    if cur:
        q["session_token"] = {"$ne": cur}
    await db.user_sessions.delete_many(q)
    return {"ok": True}


@api_router.post("/auth/set-password")
async def set_password(req: SetPasswordReq, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("password_hash"):
        raise HTTPException(409, "Password already set — use change-password")
    if len(req.new_password) < 6:
        raise HTTPException(422, "Password must be at least 6 characters")
    await db.users.update_one({"user_id": user["user_id"]},
                              {"$set": {"password_hash": pwd.hash(req.new_password)}})
    return {"ok": True}


@api_router.post("/auth/delete")
async def delete_account(req: DeleteAccountReq, user: Dict[str, Any] = Depends(get_current_user)):
    if req.confirmation != "DELETE MY ACCOUNT":
        raise HTTPException(422, "Type DELETE MY ACCOUNT exactly")
    if user.get("password_hash"):
        if not req.current_password or not pwd.verify(req.current_password, user["password_hash"]):
            raise HTTPException(401, "Current password is incorrect")
    uid = user["user_id"]
    for coll in (db.entries, db.daily_content, db.logins, db.profiles, db.uploads):
        await coll.delete_many({"userId": uid})
    await db.user_sessions.delete_many({"user_id": uid})
    await db.users.delete_one({"user_id": uid})
    return {"ok": True}


# --------------------------------------------------------------------------
# Data routes
# --------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Aura API"}


@api_router.post("/init")
async def init(req: InitRequest, account: Optional[str] = Depends(get_account_id)):
    uid = account or req.userId
    profile = await get_or_create_profile(uid)
    d = today_str()
    await db.logins.update_one(
        {"userId": uid, "date": d},
        {"$setOnInsert": {"userId": uid, "date": d, "at": now_iso()}},
        upsert=True,
    )
    streak = await compute_streak(uid)
    day_no = day_number(profile["signupDate"], d)
    return {"userId": uid, "signupDate": profile["signupDate"], "today": d,
            "dayNumber": day_no, "isSpecial": is_special(day_no), **streak}


@api_router.get("/day/{d}")
async def get_day(d: str, userId: Optional[str] = Query(None),
                  account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    profile = await get_or_create_profile(uid)
    entry = await db.entries.find_one({"userId": uid, "date": d}, {"_id": 0})
    if not entry:
        entry = empty_entry(uid, d)
    else:
        entry.setdefault("mood", "")
        entry.setdefault("workouts", [])
        entry.setdefault("photos", [])
    content = await get_or_create_content(uid, d)
    day_no = day_number(profile["signupDate"], d)
    prev = (parse_date(d) - timedelta(days=1)).strftime("%Y-%m-%d")
    prev_entry = await db.entries.find_one({"userId": uid, "date": prev}, {"_id": 0})
    prev_goals = [g for g in (prev_entry or {}).get("dailyGoals", []) if (g or "").strip()]
    # Affirmation is chosen on day 1 and every Monday (weekday 0); it carries over
    # to the rest of the days until the next Monday.
    affirmation_day = day_no == 1 or parse_date(d).weekday() == 0
    carried = ""
    recent = await db.entries.find(
        {"userId": uid, "date": {"$lte": d}}, {"_id": 0}
    ).sort("date", -1).to_list(400)
    for ce in recent:
        a = (ce.get("affirmationCustom") or "").strip() or (ce.get("affirmationSelected") or "").strip()
        if a:
            carried = a
            break
    # Weekly goals set on the most recent special day carry through the week so
    # they can be shown as a reminder on the daily "Currently Working Towards" page.
    week_goals = []
    for ce in recent:
        wg = [g for g in ce.get("weeklyGoals", []) if (g or "").strip()]
        if wg:
            week_goals = wg
            break
    return {"date": d, "dayNumber": day_no, "isSpecial": is_special(day_no),
            "entry": entry, "content": content, "hasContent": entry_has_content(entry),
            "prevGoals": prev_goals, "weekGoals": week_goals,
            "affirmationDay": affirmation_day,
            "carriedAffirmation": carried}


@api_router.put("/day/{d}")
async def save_day(d: str, entry: DayEntry, userId: Optional[str] = Query(None),
                   account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    profile = await get_or_create_profile(uid)
    day_no = day_number(profile["signupDate"], d)
    doc = entry.dict()
    doc.update({"userId": uid, "date": d, "dayNumber": day_no,
                "isSpecial": is_special(day_no), "updatedAt": now_iso()})
    await db.entries.update_one({"userId": uid, "date": d},
                                {"$set": doc, "$setOnInsert": {"createdAt": now_iso()}},
                                upsert=True)
    saved = await db.entries.find_one({"userId": uid, "date": d}, {"_id": 0})
    return {"ok": True, "entry": saved}


@api_router.get("/calendar")
async def calendar(userId: Optional[str] = Query(None),
                   account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    entries = await db.entries.find({"userId": uid}, {"_id": 0}).to_list(1000)
    days = [{"date": e["date"], "completed": entry_has_content(e),
             "isSpecial": e.get("isSpecial", False), "mood": e.get("mood", "")}
            for e in entries]
    streak = await compute_streak(uid)
    login_dates = await db.logins.distinct("date", {"userId": uid})
    return {"days": days, "loginDates": sorted(login_dates),
            "totalEntries": len([d for d in days if d["completed"]]), **streak}


@api_router.get("/search")
async def search(userId: Optional[str] = Query(None), q: str = Query(""),
                 pages: Optional[str] = Query(None),
                 date_from: Optional[str] = Query(None, alias="from"),
                 date_to: Optional[str] = Query(None, alias="to"),
                 account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    q = (q or "").strip().lower()
    if not q:
        return {"results": []}
    page_set = None
    if pages:
        page_set = {int(p) for p in pages.split(",") if p.strip().isdigit()}
    query: Dict[str, Any] = {"userId": uid}
    if date_from or date_to:
        rng: Dict[str, Any] = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to
        query["date"] = rng
    entries = await db.entries.find(query, {"_id": 0}).to_list(2000)
    results = []
    for e in entries:
        matches = []
        for field, page, label, kind in SEARCH_FIELDS:
            if page_set is not None and page not in page_set:
                continue
            if kind == "list":
                for val in e.get(field, []):
                    if val and q in val.lower():
                        matches.append({"page": page, "label": label, "snippet": val})
            else:
                val = e.get(field, "")
                if val and q in val.lower():
                    matches.append({"page": page, "label": label, "snippet": val[:180]})
        if matches:
            results.append({"date": e["date"], "dayNumber": e.get("dayNumber"), "matches": matches})
    results.sort(key=lambda r: r["date"], reverse=True)
    return {"results": results}


@api_router.get("/insights")
async def insights(userId: Optional[str] = Query(None),
                   account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    profile = await get_or_create_profile(uid)
    streak = await compute_streak(uid)
    entries = await db.entries.find({"userId": uid}, {"_id": 0}).to_list(2000)
    workout_breakdown: Dict[str, int] = {}
    mood_breakdown: Dict[str, int] = {}
    completed = 0
    for e in entries:
        if entry_has_content(e):
            completed += 1
        w = (e.get("workout") or "").strip()
        if w:
            workout_breakdown[w] = workout_breakdown.get(w, 0) + 1
        for w in e.get("workouts", []):
            w = (w or "").strip()
            if w:
                workout_breakdown[w] = workout_breakdown.get(w, 0) + 1
        mood = (e.get("mood") or "").strip()
        if mood:
            mood_breakdown[mood] = mood_breakdown.get(mood, 0) + 1
    d = today_str()
    day_no = day_number(profile["signupDate"], d)
    return {"signupDate": profile["signupDate"], "dayNumber": day_no,
            "totalEntries": completed, "workoutBreakdown": workout_breakdown,
            "moodBreakdown": mood_breakdown, **streak}


@api_router.get("/weekly-recap")
async def weekly_recap(userId: Optional[str] = Query(None), offset: int = Query(0),
                       account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    ref = datetime.now(timezone.utc).date() - timedelta(days=7 * offset)
    # Week starts on Sunday: Python weekday() is Mon=0..Sun=6
    start = ref - timedelta(days=(ref.weekday() + 1) % 7)
    end = start + timedelta(days=6)
    dates = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    entries = await db.entries.find({"userId": uid, "date": {"$in": dates}}, {"_id": 0}).to_list(50)
    by_date = {e["date"]: e for e in entries}
    mood_counts: Dict[str, int] = {}
    moods_by_day = []
    wins: List[str] = []
    entries_count = 0
    for d in dates:
        e = by_date.get(d)
        mood = (e or {}).get("mood", "")
        moods_by_day.append({"date": d, "mood": mood})
        if mood:
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
        if e and entry_has_content(e):
            entries_count += 1
        if e:
            for g in e.get("dailyGoals", []):
                if g and g.strip():
                    wins.append(g.strip())
            ww = (e.get("weekly") or {}).get("wentWell", "")
            if ww and ww.strip():
                wins.append(ww.strip())
    highlight = None
    for d in reversed(dates):
        c = await db.daily_content.find_one({"userId": uid, "date": d}, {"_id": 0})
        if c and c.get("quote"):
            highlight = c["quote"]
            break
    best = None
    for md in moods_by_day:
        if md["mood"]:
            try:
                v = int(md["mood"])
            except ValueError:
                continue
            if best is None or v >= best["moodValue"]:
                best = {"date": md["date"], "mood": md["mood"], "moodValue": v}
    if best:
        best.pop("moodValue", None)
    streak = await compute_streak(uid)
    return {"startDate": start.strftime("%Y-%m-%d"), "endDate": end.strftime("%Y-%m-%d"),
            "entriesCount": entries_count, "moodCounts": mood_counts, "moodsByDay": moods_by_day,
            "wins": wins[:5], "highlightQuote": highlight, "bestDay": best,
            "currentStreak": streak["currentStreak"]}


@api_router.post("/upload")
async def upload(file: UploadFile = File(...), userId: Optional[str] = Query(None),
                 account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 8MB)")
    ext = "jpg"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()[:5]
    ct = file.content_type or "image/jpeg"
    path = f"{APP_NAME}/uploads/{uid}/{uuid.uuid4().hex}.{ext}"
    try:
        await run_in_threadpool(put_object, path, data, ct)
    except Exception as e:  # noqa: BLE001
        logger.warning("upload failed: %s", e)
        raise HTTPException(502, "Upload failed")
    await db.uploads.insert_one({"path": path, "userId": uid, "contentType": ct, "createdAt": now_iso()})
    return {"path": path}


@api_router.get("/files/{path:path}")
async def files(path: str, uid: Optional[str] = Query(None),
                account: Optional[str] = Depends(get_account_id)):
    requester = account or uid
    if not requester:
        raise HTTPException(401, "Not authorized")
    rec = await db.uploads.find_one({"path": path}, {"_id": 0})
    if not rec or rec.get("userId") != requester:
        raise HTTPException(404, "Not found")
    try:
        content, ct = await run_in_threadpool(get_object, path)
    except Exception:  # noqa: BLE001
        raise HTTPException(404, "Not found")
    return Response(content=content, media_type=ct,
                    headers={"Cache-Control": "public, max-age=31536000"})


@api_router.get("/mood-trend")
async def mood_trend(userId: Optional[str] = Query(None), days: int = Query(30),
                     account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    days = max(7, min(days, 90))
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days - 1)
    dates = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    entries = await db.entries.find({"userId": uid, "date": {"$in": dates}}, {"_id": 0}).to_list(200)
    mood_map = {e["date"]: (e.get("mood") or "") for e in entries}
    trend = [{"date": d, "mood": mood_map.get(d, "")} for d in dates]
    vals = [int(m) for m in mood_map.values() if m]
    average = round(sum(vals) / len(vals), 1) if vals else 0
    return {"days": trend, "average": average, "count": len(vals),
            "startDate": start.strftime("%Y-%m-%d"), "endDate": end.strftime("%Y-%m-%d")}


@api_router.get("/on-this-day")
async def on_this_day(userId: Optional[str] = Query(None),
                      account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    profile = await get_or_create_profile(uid)
    today = datetime.now(timezone.utc).date()
    signup = parse_date(profile["signupDate"])
    for weeks in range(1, 53):
        d = today - timedelta(days=7 * weeks)
        if d < signup:
            break
        ds = d.strftime("%Y-%m-%d")
        e = await db.entries.find_one({"userId": uid, "date": ds}, {"_id": 0})
        if e and entry_has_content(e):
            snippet = ""
            if (e.get("journal") or "").strip():
                snippet = e["journal"].strip()[:160]
            else:
                for key in ("blessings", "dailyGoals", "morningRitual"):
                    vals = [v for v in e.get(key, []) if (v or "").strip()]
                    if vals:
                        snippet = vals[0].strip()[:160]
                        break
            return {"found": True, "date": ds, "weeksAgo": weeks,
                    "dayNumber": e.get("dayNumber"), "mood": e.get("mood", ""),
                    "snippet": snippet}
    return {"found": False}


@api_router.get("/gratitude-trends")
async def gratitude_trends(userId: Optional[str] = Query(None),
                           account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    entries = await db.entries.find({"userId": uid}, {"_id": 0}).to_list(3000)

    def tally(field: str):
        counts: Dict[str, int] = {}
        display: Dict[str, str] = {}
        for e in entries:
            for v in e.get(field, []):
                t = (v or "").strip()
                if not t:
                    continue
                k = t.lower()
                counts[k] = counts.get(k, 0) + 1
                display.setdefault(k, t)
        top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
        return [{"text": display[k], "count": c} for k, c in top if c >= 2][:6]

    return {"blessings": tally("blessings"), "goals": tally("dailyGoals")}


@api_router.get("/yearly-wrap")
async def yearly_wrap(userId: Optional[str] = Query(None), year: Optional[int] = Query(None),
                      account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    y = year or datetime.now(timezone.utc).year
    prefix = f"{y}-"
    entries = await db.entries.find({"userId": uid, "date": {"$regex": f"^{y}-"}}, {"_id": 0}).to_list(2000)
    login_dates = [d for d in await db.logins.distinct("date", {"userId": uid}) if d.startswith(prefix)]

    mood_vals: List[int] = []
    mood_counts: Dict[str, int] = {}
    workouts: Dict[str, int] = {}
    photos = 0
    entries_count = 0
    month_counts: Dict[str, int] = {}
    win_counts: Dict[str, int] = {}
    win_display: Dict[str, str] = {}
    for e in entries:
        if entry_has_content(e):
            entries_count += 1
            month_counts[e["date"][:7]] = month_counts.get(e["date"][:7], 0) + 1
        m = (e.get("mood") or "").strip()
        if m:
            mood_counts[m] = mood_counts.get(m, 0) + 1
            try:
                mood_vals.append(int(m))
            except ValueError:
                pass
        for w in e.get("workouts", []):
            w = (w or "").strip()
            if w:
                workouts[w] = workouts.get(w, 0) + 1
        photos += len(e.get("photos", []))
        wins = list(e.get("dailyGoals", []))
        ww = (e.get("weekly") or {}).get("wentWell", "")
        if ww:
            wins.append(ww)
        for wtxt in wins:
            t = (wtxt or "").strip()
            if t:
                k = t.lower()
                win_counts[k] = win_counts.get(k, 0) + 1
                win_display.setdefault(k, t)

    best_month = max(month_counts.items(), key=lambda kv: kv[1])[0] if month_counts else None
    top_wins = [win_display[k] for k, _ in sorted(win_counts.items(), key=lambda kv: kv[1], reverse=True)][:5]
    avg_mood = round(sum(mood_vals) / len(mood_vals), 1) if mood_vals else 0
    streak = await compute_streak(uid)
    return {"year": y, "entriesCount": entries_count, "daysLoggedIn": len(login_dates),
            "avgMood": avg_mood, "moodCounts": mood_counts, "workoutBreakdown": workouts,
            "photos": photos, "bestMonth": best_month, "topWins": top_wins,
            "longestStreak": streak["longestStreak"], "currentStreak": streak["currentStreak"]}


@api_router.get("/gratitude-wall")
async def gratitude_wall(userId: Optional[str] = Query(None),
                         account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    entries = await db.entries.find({"userId": uid}, {"_id": 0}).to_list(3000)
    items = []
    for e in entries:
        for b in e.get("blessings", []):
            t = (b or "").strip()
            if t:
                items.append({"date": e["date"], "text": t})
    items.sort(key=lambda x: x["date"], reverse=True)
    return {"items": items, "total": len(items)}


app.include_router(api_router)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def ensure_indexes():
    try:
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.uploads.create_index("path", unique=True)
        await db.uploads.create_index("userId")
    except Exception as e:  # noqa: BLE001
        logger.warning("index setup: %s", e)
    try:
        await run_in_threadpool(init_storage)
    except Exception as e:  # noqa: BLE001
        logger.warning("storage init: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
