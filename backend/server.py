from fastapi import FastAPI, APIRouter, Query, Header, Depends, HTTPException
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
    ("actionsTomorrow", 9, "Tomorrow's Actions", "list"),
    ("journal", 10, "Journal", "text"),
]


def empty_entry(user_id: str, d: str) -> Dict[str, Any]:
    return {
        "userId": user_id, "date": d,
        "morningRitual": ["", "", ""],
        "weeklyGoals": ["", "", "", "", ""],
        "blessings": ["", "", ""],
        "affirmationSelected": "", "affirmationCustom": "",
        "workouts": [], "mood": "",
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


async def compute_streak(user_id: str) -> Dict[str, int]:
    dates = await db.logins.distinct("date", {"userId": user_id})
    date_set = set(dates)
    login_days = len(date_set)
    current = 0
    cursor = datetime.now(timezone.utc).date()
    while cursor.strftime("%Y-%m-%d") in date_set:
        current += 1
        cursor = cursor - timedelta(days=1)
    longest, run, prev = 0, 0, None
    for dt in sorted(parse_date(x) for x in date_set):
        run = run + 1 if (prev is not None and (dt - prev).days == 1) else 1
        longest = max(longest, run)
        prev = dt
    return {"loginDays": login_days, "currentStreak": current, "longestStreak": longest}


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


def user_public(u: Dict[str, Any]) -> Dict[str, str]:
    return {"user_id": u["user_id"], "email": u.get("email", ""),
            "name": u.get("name", ""), "picture": u.get("picture", "")}


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
    u = await db.users.find_one({"user_id": account}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(401, "Not authenticated")
    return {"user": user_public(u)}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
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
    content = await get_or_create_content(uid, d)
    day_no = day_number(profile["signupDate"], d)
    return {"date": d, "dayNumber": day_no, "isSpecial": is_special(day_no),
            "entry": entry, "content": content, "hasContent": entry_has_content(entry)}


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
                 account: Optional[str] = Depends(get_account_id)):
    uid = require_id(account, userId)
    q = (q or "").strip().lower()
    if not q:
        return {"results": []}
    entries = await db.entries.find({"userId": uid}, {"_id": 0}).to_list(2000)
    results = []
    for e in entries:
        matches = []
        for field, page, label, kind in SEARCH_FIELDS:
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
    streak = await compute_streak(uid)
    return {"startDate": start.strftime("%Y-%m-%d"), "endDate": end.strftime("%Y-%m-%d"),
            "entriesCount": entries_count, "moodCounts": mood_counts, "moodsByDay": moods_by_day,
            "wins": wins[:5], "highlightQuote": highlight, "currentStreak": streak["currentStreak"]}


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
    except Exception as e:  # noqa: BLE001
        logger.warning("index setup: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
