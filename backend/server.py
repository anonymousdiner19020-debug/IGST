from fastapi import FastAPI, APIRouter, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, date as date_cls, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def parse_date(d: str) -> date_cls:
    return datetime.strptime(d, "%Y-%m-%d").date()


def day_number(signup: str, target: str) -> int:
    """1-indexed day count since signup date."""
    return (parse_date(target) - parse_date(signup)).days + 1


def is_special(day_no: int) -> bool:
    # Special (weekly) pages appear on day 1 and every 7th day (7, 14, 21...)
    return day_no == 1 or (day_no > 0 and day_no % 7 == 0)


# Searchable page config: field -> (page number, label, kind)
SEARCH_FIELDS = [
    ("morningRitual", 1, "Taking Control", "list"),
    ("blessings", 3, "Blessings", "list"),
    ("workout", 5, "Workout", "text"),
    ("dailyGoals", 6, "Daily Goals", "list"),
    ("actionsYesterday", 8, "Yesterday's Actions", "list"),
    ("actionsTomorrow", 9, "Tomorrow's Actions", "list"),
    ("journal", 10, "Journal", "text"),
]


def empty_entry(user_id: str, d: str) -> Dict[str, Any]:
    return {
        "userId": user_id,
        "date": d,
        "morningRitual": ["", "", ""],
        "weeklyGoals": ["", "", "", "", ""],
        "blessings": ["", "", ""],
        "affirmationSelected": "",
        "affirmationCustom": "",
        "workout": "",
        "dailyGoals": ["", "", "", "", ""],
        "actionsYesterday": ["", "", "", "", ""],
        "accomplishedYesterday": None,
        "accomplishedCount": "",
        "actionsTomorrow": ["", "", "", "", ""],
        "tomorrowNotes": ["", "", ""],
        "journal": "",
        "weekly": {"wentWell": "", "improve": "", "learned": ""},
    }


def entry_has_content(entry: Dict[str, Any]) -> bool:
    for key in [
        "morningRitual", "weeklyGoals", "blessings", "dailyGoals",
        "actionsYesterday", "actionsTomorrow", "tomorrowNotes",
    ]:
        if any((v or "").strip() for v in entry.get(key, [])):
            return True
    if (entry.get("affirmationSelected") or entry.get("affirmationCustom") or "").strip():
        return True
    if (entry.get("workout") or "").strip():
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
# AI content generation
# --------------------------------------------------------------------------
FALLBACK_AFFIRMATIONS = [
    "I am becoming the person I choose to be.",
    "Every small step moves me forward.",
    "I have the power to shape my day.",
]
FALLBACK_QUOTE = {
    "text": "The secret of getting ahead is getting started.",
    "author": "Mark Twain",
}


async def generate_daily_content(d: str) -> Dict[str, Any]:
    if not EMERGENT_LLM_KEY:
        return {"affirmations": FALLBACK_AFFIRMATIONS, "quote": FALLBACK_QUOTE}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"daily-{d}",
            system_message=(
                "You are a warm, grounded wellness coach who writes fresh, "
                "non-cliche motivational content for a personal growth journal."
            ),
        ).with_model("openai", "gpt-5.4-mini")

        prompt = (
            "Return ONLY valid JSON (no markdown) with keys: "
            "'affirmations' -> an array of exactly 3 short first-person, present-tense "
            "affirmations (4-10 words each, varied, uplifting) and "
            "'quote' -> an object with 'text' (a real inspirational quote, max 20 words) "
            "and 'author'. Make the content feel fresh and specific for the date "
            f"{d}. Avoid overused quotes."
        )
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        text = text.strip()
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            text = m.group(0)
        data = json.loads(text)
        affirmations = data.get("affirmations") or []
        affirmations = [str(a).strip() for a in affirmations if str(a).strip()][:3]
        if len(affirmations) < 3:
            affirmations = (affirmations + FALLBACK_AFFIRMATIONS)[:3]
        quote = data.get("quote") or {}
        quote = {
            "text": str(quote.get("text") or FALLBACK_QUOTE["text"]).strip(),
            "author": str(quote.get("author") or "").strip(),
        }
        return {"affirmations": affirmations, "quote": quote}
    except Exception as e:  # noqa: BLE001
        logger.warning("AI generation failed: %s", e)
        return {"affirmations": FALLBACK_AFFIRMATIONS, "quote": FALLBACK_QUOTE}


async def get_or_create_content(user_id: str, d: str) -> Dict[str, Any]:
    existing = await db.daily_content.find_one({"userId": user_id, "date": d}, {"_id": 0})
    if existing:
        return {"affirmations": existing["affirmations"], "quote": existing["quote"]}
    content = await generate_daily_content(d)
    doc = {"userId": user_id, "date": d, **content,
           "createdAt": datetime.now(timezone.utc).isoformat()}
    await db.daily_content.insert_one(doc)
    return content


async def get_or_create_profile(user_id: str) -> Dict[str, Any]:
    profile = await db.profiles.find_one({"userId": user_id}, {"_id": 0})
    if not profile:
        profile = {
            "userId": user_id,
            "signupDate": today_str(),
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
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

    longest = 0
    run = 0
    prev = None
    for dt in sorted(parse_date(x) for x in date_set):
        if prev is not None and (dt - prev).days == 1:
            run += 1
        else:
            run = 1
        longest = max(longest, run)
        prev = dt

    return {"loginDays": login_days, "currentStreak": current, "longestStreak": longest}


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
    workout: str = ""
    dailyGoals: List[str] = Field(default_factory=lambda: ["", "", "", "", ""])
    actionsYesterday: List[str] = Field(default_factory=lambda: ["", "", "", "", ""])
    accomplishedYesterday: Optional[bool] = None
    accomplishedCount: str = ""
    actionsTomorrow: List[str] = Field(default_factory=lambda: ["", "", "", "", ""])
    tomorrowNotes: List[str] = Field(default_factory=lambda: ["", "", ""])
    journal: str = ""
    weekly: Dict[str, str] = Field(
        default_factory=lambda: {"wentWell": "", "improve": "", "learned": ""}
    )


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Aura API"}


@api_router.post("/init")
async def init(req: InitRequest):
    profile = await get_or_create_profile(req.userId)
    d = today_str()
    await db.logins.update_one(
        {"userId": req.userId, "date": d},
        {"$setOnInsert": {"userId": req.userId, "date": d,
                          "at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    streak = await compute_streak(req.userId)
    day_no = day_number(profile["signupDate"], d)
    return {
        "userId": req.userId,
        "signupDate": profile["signupDate"],
        "today": d,
        "dayNumber": day_no,
        "isSpecial": is_special(day_no),
        **streak,
    }


@api_router.get("/day/{d}")
async def get_day(d: str, userId: str = Query(...)):
    profile = await get_or_create_profile(userId)
    entry = await db.entries.find_one({"userId": userId, "date": d}, {"_id": 0})
    if not entry:
        entry = empty_entry(userId, d)
    content = await get_or_create_content(userId, d)
    day_no = day_number(profile["signupDate"], d)
    return {
        "date": d,
        "dayNumber": day_no,
        "isSpecial": is_special(day_no),
        "entry": entry,
        "content": content,
        "hasContent": entry_has_content(entry),
    }


@api_router.put("/day/{d}")
async def save_day(d: str, entry: DayEntry, userId: str = Query(...)):
    profile = await get_or_create_profile(userId)
    day_no = day_number(profile["signupDate"], d)
    doc = entry.dict()
    doc.update({
        "userId": userId,
        "date": d,
        "dayNumber": day_no,
        "isSpecial": is_special(day_no),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })
    await db.entries.update_one(
        {"userId": userId, "date": d},
        {"$set": doc,
         "$setOnInsert": {"createdAt": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    saved = await db.entries.find_one({"userId": userId, "date": d}, {"_id": 0})
    return {"ok": True, "entry": saved}


@api_router.get("/calendar")
async def calendar(userId: str = Query(...)):
    entries = await db.entries.find({"userId": userId}, {"_id": 0}).to_list(1000)
    days = []
    for e in entries:
        days.append({
            "date": e["date"],
            "completed": entry_has_content(e),
            "isSpecial": e.get("isSpecial", False),
        })
    streak = await compute_streak(userId)
    login_dates = await db.logins.distinct("date", {"userId": userId})
    return {
        "days": days,
        "loginDates": sorted(login_dates),
        "totalEntries": len([d for d in days if d["completed"]]),
        **streak,
    }


@api_router.get("/search")
async def search(userId: str = Query(...), q: str = Query("")):
    q = (q or "").strip().lower()
    if not q:
        return {"results": []}
    entries = await db.entries.find({"userId": userId}, {"_id": 0}).to_list(2000)
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
            results.append({
                "date": e["date"],
                "dayNumber": e.get("dayNumber"),
                "matches": matches,
            })
    results.sort(key=lambda r: r["date"], reverse=True)
    return {"results": results}


@api_router.get("/insights")
async def insights(userId: str = Query(...)):
    profile = await get_or_create_profile(userId)
    streak = await compute_streak(userId)
    entries = await db.entries.find({"userId": userId}, {"_id": 0}).to_list(2000)
    workout_breakdown: Dict[str, int] = {}
    completed = 0
    for e in entries:
        if entry_has_content(e):
            completed += 1
        w = (e.get("workout") or "").strip()
        if w:
            workout_breakdown[w] = workout_breakdown.get(w, 0) + 1
    d = today_str()
    day_no = day_number(profile["signupDate"], d)
    return {
        "signupDate": profile["signupDate"],
        "dayNumber": day_no,
        "totalEntries": completed,
        "workoutBreakdown": workout_breakdown,
        **streak,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
