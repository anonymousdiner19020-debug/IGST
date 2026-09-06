from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Body
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Static Philly Dish Catalog ----------
DISH_CATALOG = [
    {"id": "soft_pretzel", "name": "Soft Pretzel", "emoji": "🥨", "unlock_level": 1,
     "recipe": {"dough": 2, "salt": 2, "cheese_sauce": 2, "mustard": 2, "pizza_sauce": 2}, "reward_coins": 40, "moves": 30},
    {"id": "happy_cakes", "name": "Happy Cakes", "emoji": "🧁", "unlock_level": 2,
     "recipe": {"pb_cake": 2, "chocolate_cake": 2, "butterscotch_cake": 2, "mini_pie": 2, "sprinkles": 2}, "reward_coins": 55, "moves": 30},
    {"id": "water_ice", "name": "Water Ice", "emoji": "🍧", "unlock_level": 3,
     "recipe": {"cup": 2, "cherry": 2, "rootbeer": 2, "lemon": 2, "blueberry": 2}, "reward_coins": 65, "moves": 30},
    {"id": "american_hoagie", "name": "American Hoagie", "emoji": "🥖", "unlock_level": 5,
     "recipe": {"roll": 2, "ham": 2, "cheese": 2, "lettuce": 2, "onion": 2}, "reward_coins": 80, "moves": 32},
    {"id": "italian_hoagie", "name": "Italian Hoagie", "emoji": "🥖", "unlock_level": 6,
     "recipe": {"roll": 2, "salami": 2, "provolone": 2, "capicola": 2, "pepperoni": 2}, "reward_coins": 95, "moves": 32},
    {"id": "cheesesteak", "name": "Cheesesteak", "emoji": "🥪", "unlock_level": 7,
     "recipe": {"steak": 2, "roll": 2, "onion": 2, "american": 2, "mushroom": 2}, "reward_coins": 110, "moves": 32},
    {"id": "roast_pork", "name": "Roast Pork", "emoji": "🥓", "unlock_level": 8,
     "recipe": {"pork": 2, "roll": 2, "broccoli": 2, "spinach": 2, "provolone": 2}, "reward_coins": 130, "moves": 34},
    {"id": "scrapple_ec", "name": "Scrapple, Egg & Cheese", "emoji": "🍳", "unlock_level": 9,
     "recipe": {"scrapple": 2, "egg": 2, "american": 2, "long_roll": 2, "round_roll": 2}, "reward_coins": 150, "moves": 34},
    {"id": "seasoned_fries", "name": "Seasoned Fries", "emoji": "🍟", "unlock_level": 10,
     "recipe": {"potato": 2, "small_cup": 2, "seasoning": 2, "american_melt": 2, "cheddar_melt": 2}, "reward_coins": 165, "moves": 34},
    {"id": "tomato_pie", "name": "Tomato Pie", "emoji": "🍕", "unlock_level": 11,
     "recipe": {"dough": 2, "tomato": 2, "olive_oil": 2, "pepperoni": 2, "basil": 2}, "reward_coins": 180, "moves": 36},
    {"id": "porkroll_ec", "name": "Pork Roll, Egg & Cheese", "emoji": "🥪", "unlock_level": 12,
     "recipe": {"porkroll": 2, "egg": 2, "cheese": 2, "round_roll": 2, "long_roll": 2}, "reward_coins": 195, "moves": 36},
    {"id": "philly_candy", "name": "Philly Candy Box", "emoji": "🍬", "unlock_level": 13,
     "recipe": {"peanut_chews": 2, "irish_potatoes": 2, "whitmans": 2, "peeps": 2, "candy_corn": 2}, "reward_coins": 220, "moves": 36},
    {"id": "pierogies", "name": "Pierogies", "emoji": "🥟", "unlock_level": 14,
     "recipe": {"potato_raw": 2, "onion": 2, "cheddar": 2, "steak": 2, "sauerkraut": 2}, "reward_coins": 235, "moves": 36},
    {"id": "sweet_treats", "name": "Sweet Treats Box", "emoji": "🍭", "unlock_level": 15,
     "recipe": {"good_and_plenty": 2, "double_bubble": 2, "easter_eggs": 2, "mallo_cups": 2, "peppermint_patties": 2}, "reward_coins": 245, "moves": 36},
    {"id": "fruit_pierogies", "name": "Fruit Pierogies", "emoji": "🥟", "unlock_level": 16,
     "recipe": {"strawberry": 2, "blueberry": 2, "blackberry": 2, "apple": 2, "cherry": 2}, "reward_coins": 255, "moves": 36},
    {"id": "donuts", "name": "Donuts", "emoji": "🍩", "unlock_level": 4,
     "recipe": {"vanilla_donut": 2, "chocolate_donut": 2, "strawberry_donut": 2, "sprinkles": 2}, "reward_coins": 210, "moves": 36},
]

SHOP_ITEMS = [
    {"id": "extra_moves", "name": "Extra Moves (+5)", "emoji": "➕", "cost": 40, "type": "consumable"},
    {"id": "hint", "name": "Hint Booster", "emoji": "💡", "cost": 25, "type": "consumable"},
    {"id": "coin_doubler", "name": "Coin Doubler (1 order)", "emoji": "💰", "cost": 60, "type": "consumable"},
    {"id": "hammer", "name": "Ingredient Hammer", "emoji": "🔨", "cost": 35, "type": "consumable"},
    {"id": "shuffle", "name": "Board Shuffle", "emoji": "🔀", "cost": 30, "type": "consumable"},
]

GRILL_MAX = 3
GRILL_BASE_COST = 150
PANTRY_MAX = 3
PANTRY_BASE_COST = 120
DAILY_BONUS_MULTIPLIER = 2.0

# Coin-spend upgrade catalog (levels 0..max)
UPGRADES = {
    "grill": {"field": "grill_level", "max": GRILL_MAX, "base": GRILL_BASE_COST,
              "name": "Bigger Grill", "emoji": "🔥",
              "desc": "Start each level with base ingredients pre-stocked."},
    "pantry": {"field": "pantry_level", "max": PANTRY_MAX, "base": PANTRY_BASE_COST,
               "name": "Ingredient Pantry", "emoji": "🥫",
               "desc": "Store leftover toppings and reuse them in later levels."},
    "plates": {"field": "plates_level", "max": 3, "base": 100,
               "name": "Serving Plates", "emoji": "🍽️",
               "desc": "Serve more customers per level for more coins."},
    "holding": {"field": "holding_level", "max": 3, "base": 130,
                "name": "Bigger Holding Area", "emoji": "🧺",
                "desc": "Expand pantry storage capacity beyond level 3."},
}


def upgrade_cost(key: str, level: int) -> int:
    return UPGRADES[key]["base"] * (level + 1)


def pantry_capacity(doc: dict) -> int:
    # base pantry per-item cap plus 2 per holding-area level
    return doc.get("pantry_level", 0) + doc.get("holding_level", 0) * 2


# Real-money coin packs (granted server-side via RevenueCat webhook)
PRODUCT_COINS = {
    "coins_500": 500,
    "coins_1200": 1200,
    "coins_3000": 3000,
}

# Real-money Liberty Bell packs (same price tiers as coins)
PRODUCT_BELLS = {
    "bells_5": 5,
    "bells_20": 20,
    "bells_50": 50,
}

RETRY_BELL_COST = 1
STARTING_BELLS = 3


# ---------- Models ----------
class PlayerCreate(BaseModel):
    username: str


class Player(BaseModel):
    id: str
    username: str
    coins: int
    high_score: int
    current_level: int
    dishes_cooked: int
    unlocked_dishes: List[str]
    boosters: dict
    created_at: str


class LevelResult(BaseModel):
    level: int
    dish_id: str
    score: int
    coins_earned: int
    bells_earned: int = 0
    completed: bool  # True if order fulfilled
    stars: int = 0  # 0-3 rating for this attempt


class PurchaseRequest(BaseModel):
    item_id: str


def player_public(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "username": doc["username"],
        "coins": doc.get("coins", 0),
        "bells": doc.get("bells", 0),
        "high_score": doc.get("high_score", 0),
        "current_level": doc.get("current_level", 1),
        "dishes_cooked": doc.get("dishes_cooked", 0),
        "unlocked_dishes": doc.get("unlocked_dishes", ["soft_pretzel"]),
        "boosters": doc.get("boosters", {}),
        "grill_level": doc.get("grill_level", 0),
        "pantry_level": doc.get("pantry_level", 0),
        "plates_level": doc.get("plates_level", 0),
        "holding_level": doc.get("holding_level", 0),
        "pantry": doc.get("pantry", {}),
        "crown": doc.get("crown", False),
        "champion_weeks": doc.get("champion_weeks", []),
        "stars": doc.get("stars", {}),
        "fan_served": doc.get("fan_served", {}),
        "daily_streak": doc.get("daily_streak", 0),
        "last_reward_date": doc.get("last_reward_date"),
        "created_at": doc.get("created_at", ""),
    }


def grill_cost(level: int) -> int:
    return GRILL_BASE_COST * (level + 1)


def pantry_cost(level: int) -> int:
    return PANTRY_BASE_COST * (level + 1)


def current_week_key() -> str:
    now = datetime.now(timezone.utc)
    iso = now.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


# 7-day daily login reward cycle. Streak day = ((streak - 1) % 7).
DAILY_REWARDS = [
    {"coins": 25, "bells": 0},
    {"coins": 40, "bells": 0},
    {"coins": 60, "bells": 1},
    {"coins": 80, "bells": 0},
    {"coins": 100, "bells": 1},
    {"coins": 120, "bells": 0},
    {"coins": 150, "bells": 2},
]


def daily_reward_for(streak: int) -> dict:
    idx = (max(1, streak) - 1) % len(DAILY_REWARDS)
    r = DAILY_REWARDS[idx]
    return {"coins": r["coins"], "bells": r["bells"], "day": idx + 1}


def next_monday_iso() -> str:
    now = datetime.now(timezone.utc)
    days_ahead = (7 - now.weekday()) % 7  # Monday=0
    if days_ahead == 0:
        days_ahead = 7
    from datetime import timedelta
    return (now + timedelta(days=days_ahead)).date().isoformat()


WEEKLY_CHAMPION_PRIZE = 500

# Rotating daily challenge — one goal per UTC day from a fixed pool.
DAILY_GOALS = [
    {"id": "special3", "metric": "special_served", "target": 3, "reward": 150, "label": "Serve 3 Special Orders", "icon": "⭐"},
    {"id": "serve25", "metric": "customers_served", "target": 25, "reward": 120, "label": "Serve 25 Customers", "icon": "🍽️"},
    {"id": "perfect15", "metric": "perfect_serves", "target": 15, "reward": 140, "label": "Nail 15 Perfect Serves", "icon": "✨"},
    {"id": "levels3", "metric": "levels_completed", "target": 3, "reward": 130, "label": "Complete 3 Levels", "icon": "🏆"},
    {"id": "fans5", "metric": "fans_served", "target": 5, "reward": 150, "label": "Serve 5 Philly Fans", "icon": "🦅"},
]


def daily_goal_def(date_str: str | None = None) -> dict:
    d = datetime.fromisoformat(date_str).date() if date_str else datetime.now(timezone.utc).date()
    return DAILY_GOALS[d.toordinal() % len(DAILY_GOALS)]


async def settle_previous_weeks():
    """Close out any finished weeks: crown the top scorer and award a coin prize.
    Idempotent — records settled weeks in the `champions` collection."""
    current = current_week_key()
    past_weeks = await db.players.distinct("weekly.week", {"weekly.week": {"$ne": current}})
    for wk in past_weeks:
        if not wk:
            continue
        already = await db.champions.find_one({"week": wk})
        if already:
            continue
        top = await db.players.find_one(
            {"weekly.week": wk, "weekly.score": {"$gt": 0}},
            {"_id": 0},
            sort=[("weekly.score", -1)],
        )
        if not top:
            # nothing worth crowning for that week; still mark settled to avoid rescans
            await db.champions.insert_one({"week": wk, "player_id": None, "settled": True})
            continue
        await db.champions.insert_one(
            {
                "week": wk,
                "player_id": top["id"],
                "username": top.get("username", "Chef"),
                "score": top.get("weekly", {}).get("score", 0),
                "prize": WEEKLY_CHAMPION_PRIZE,
                "settled": True,
            }
        )
        await db.players.update_one(
            {"id": top["id"]},
            {
                "$inc": {"coins": WEEKLY_CHAMPION_PRIZE},
                "$set": {"crown": True},
                "$addToSet": {"champion_weeks": wk},
            },
        )


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Philly Food Frenzy API"}


@api_router.get("/dishes")
async def get_dishes():
    return {"dishes": DISH_CATALOG}


@api_router.get("/shop")
async def get_shop():
    return {"items": SHOP_ITEMS}


@api_router.post("/players")
async def create_player(payload: PlayerCreate):
    username = payload.username.strip()[:20] or "Chef"
    doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "coins": 100,
        "bells": STARTING_BELLS,
        "high_score": 0,
        "current_level": 1,
        "dishes_cooked": 0,
        "unlocked_dishes": ["soft_pretzel"],
        "boosters": {"extra_moves": 0, "hint": 1, "coin_doubler": 0, "hammer": 0, "shuffle": 1},
        "grill_level": 0,
        "pantry_level": 0,
        "plates_level": 0,
        "holding_level": 0,
        "pantry": {},
        "crown": False,
        "champion_weeks": [],
        "stars": {},
        "fan_served": {},
        "daily_streak": 0,
        "last_reward_date": None,
        "weekly": {"week": current_week_key(), "score": 0},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.players.insert_one(doc)
    return player_public(doc)


@api_router.get("/players/{player_id}")
async def get_player(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    return player_public(doc)


@api_router.post("/players/{player_id}/complete-level")
async def complete_level(player_id: str, result: LevelResult):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")

    coins = doc.get("coins", 0) + max(0, result.coins_earned)
    bells = doc.get("bells", 0) + max(0, result.bells_earned)
    high_score = max(doc.get("high_score", 0), result.score)
    dishes_cooked = doc.get("dishes_cooked", 0) + (1 if result.completed else 0)
    unlocked = list(doc.get("unlocked_dishes", ["soft_pretzel"]))
    current_level = doc.get("current_level", 1)

    if result.completed:
        # unlock next dish and advance level pointer
        next_level = result.level + 1
        next_dish = next((d for d in DISH_CATALOG if d["unlock_level"] == next_level), None)
        if next_dish and next_dish["id"] not in unlocked:
            unlocked.append(next_dish["id"])
        if next_level > current_level:
            current_level = min(next_level, len(DISH_CATALOG))

    update = {
        "coins": coins,
        "bells": bells,
        "high_score": high_score,
        "dishes_cooked": dishes_cooked,
        "unlocked_dishes": unlocked,
        "current_level": current_level,
    }

    # Best star rating (0-3) per level.
    if result.completed and result.stars > 0:
        stars = dict(doc.get("stars", {}))
        key = str(result.level)
        stars[key] = max(int(stars.get(key, 0)), int(result.stars))
        update["stars"] = stars

    # Weekly tournament score (resets each ISO week)
    wk = current_week_key()
    weekly = doc.get("weekly", {"week": wk, "score": 0})
    if weekly.get("week") != wk:
        weekly = {"week": wk, "score": result.score}
    else:
        weekly = {"week": wk, "score": max(weekly.get("score", 0), result.score)}
    update["weekly"] = weekly

    await db.players.update_one({"id": player_id}, {"$set": update})
    doc.update(update)
    return player_public(doc)


@api_router.post("/players/{player_id}/purchase")
async def purchase(player_id: str, payload: PurchaseRequest):
    item = next((i for i in SHOP_ITEMS if i["id"] == payload.item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    if doc.get("coins", 0) < item["cost"]:
        raise HTTPException(status_code=400, detail="Not enough coins")
    boosters = dict(doc.get("boosters", {}))
    boosters[item["id"]] = boosters.get(item["id"], 0) + 1
    new_coins = doc["coins"] - item["cost"]
    await db.players.update_one(
        {"id": player_id},
        {"$set": {"coins": new_coins, "boosters": boosters}},
    )
    doc["coins"] = new_coins
    doc["boosters"] = boosters
    return player_public(doc)


@api_router.post("/players/{player_id}/use-booster")
async def use_booster(player_id: str, payload: PurchaseRequest):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    boosters = dict(doc.get("boosters", {}))
    if boosters.get(payload.item_id, 0) <= 0:
        raise HTTPException(status_code=400, detail="No booster available")
    boosters[payload.item_id] -= 1
    await db.players.update_one({"id": player_id}, {"$set": {"boosters": boosters}})
    doc["boosters"] = boosters
    return player_public(doc)


@api_router.get("/leaderboard")
async def leaderboard():
    cursor = db.players.find(
        {}, {"_id": 0, "id": 1, "username": 1, "high_score": 1, "dishes_cooked": 1}
    ).sort("high_score", -1).limit(20)
    rows = await cursor.to_list(length=20)
    return {"leaderboard": rows}


@api_router.post("/players/{player_id}/upgrade-grill")
async def upgrade_grill(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    level = doc.get("grill_level", 0)
    if level >= GRILL_MAX:
        raise HTTPException(status_code=400, detail="Grill already fully upgraded")
    cost = grill_cost(level)
    if doc.get("coins", 0) < cost:
        raise HTTPException(status_code=400, detail="Not enough coins")
    new_level = level + 1
    new_coins = doc["coins"] - cost
    await db.players.update_one(
        {"id": player_id}, {"$set": {"coins": new_coins, "grill_level": new_level}}
    )
    doc["coins"] = new_coins
    doc["grill_level"] = new_level
    return player_public(doc)


@api_router.get("/grill-info/{player_id}")
async def grill_info(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    level = doc.get("grill_level", 0)
    return {
        "grill_level": level,
        "max_level": GRILL_MAX,
        "next_cost": grill_cost(level) if level < GRILL_MAX else None,
        "maxed": level >= GRILL_MAX,
    }


@api_router.get("/daily-special")
async def daily_special():
    # Deterministic pick based on UTC day so it rotates once per day.
    today = datetime.now(timezone.utc)
    day_index = today.toordinal()
    dish = DISH_CATALOG[day_index % len(DISH_CATALOG)]
    return {
        "date": today.date().isoformat(),
        "dish_id": dish["id"],
        "name": dish["name"],
        "emoji": dish["emoji"],
        "bonus_multiplier": DAILY_BONUS_MULTIPLIER,
    }


@api_router.get("/pantry-info/{player_id}")
async def pantry_info(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    level = doc.get("pantry_level", 0)
    cap = pantry_capacity(doc)
    return {
        "pantry_level": level,
        "max_level": PANTRY_MAX,
        "next_cost": pantry_cost(level) if level < PANTRY_MAX else None,
        "maxed": level >= PANTRY_MAX,
        "per_item_cap": cap,
        "pantry": doc.get("pantry", {}),
    }


@api_router.post("/players/{player_id}/upgrade-pantry")
async def upgrade_pantry(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    level = doc.get("pantry_level", 0)
    if level >= PANTRY_MAX:
        raise HTTPException(status_code=400, detail="Pantry already fully upgraded")
    cost = pantry_cost(level)
    if doc.get("coins", 0) < cost:
        raise HTTPException(status_code=400, detail="Not enough coins")
    new_level = level + 1
    new_coins = doc["coins"] - cost
    await db.players.update_one(
        {"id": player_id}, {"$set": {"coins": new_coins, "pantry_level": new_level}}
    )
    doc["coins"] = new_coins
    doc["pantry_level"] = new_level
    return player_public(doc)


class PantrySave(BaseModel):
    pantry: dict


class SpendBells(BaseModel):
    amount: int = 1


@api_router.post("/players/{player_id}/save-pantry")
async def save_pantry(player_id: str, payload: PantrySave):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    cap = pantry_capacity(doc)
    cleaned: dict = {}
    if cap > 0:
        for k, v in (payload.pantry or {}).items():
            try:
                n = int(v)
            except (TypeError, ValueError):
                continue
            if n > 0:
                cleaned[k] = min(cap, n)
    await db.players.update_one({"id": player_id}, {"$set": {"pantry": cleaned}})
    doc["pantry"] = cleaned
    return player_public(doc)


@api_router.get("/upgrades-info/{player_id}")
async def upgrades_info(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    out = {}
    for key, cfg in UPGRADES.items():
        level = doc.get(cfg["field"], 0)
        out[key] = {
            "name": cfg["name"],
            "emoji": cfg["emoji"],
            "desc": cfg["desc"],
            "level": level,
            "max_level": cfg["max"],
            "next_cost": upgrade_cost(key, level) if level < cfg["max"] else None,
            "maxed": level >= cfg["max"],
        }
    return {"upgrades": out, "coins": doc.get("coins", 0)}


@api_router.post("/players/{player_id}/upgrade/{key}")
async def upgrade_generic(player_id: str, key: str):
    cfg = UPGRADES.get(key)
    if not cfg:
        raise HTTPException(status_code=404, detail="Unknown upgrade")
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    level = doc.get(cfg["field"], 0)
    if level >= cfg["max"]:
        raise HTTPException(status_code=400, detail="Already fully upgraded")
    cost = upgrade_cost(key, level)
    if doc.get("coins", 0) < cost:
        raise HTTPException(status_code=400, detail="Not enough coins")
    new_level = level + 1
    new_coins = doc["coins"] - cost
    await db.players.update_one(
        {"id": player_id}, {"$set": {"coins": new_coins, cfg["field"]: new_level}}
    )
    doc["coins"] = new_coins
    doc[cfg["field"]] = new_level
    return player_public(doc)


@api_router.get("/weekly-leaderboard")
async def weekly_leaderboard():
    await settle_previous_weeks()
    wk = current_week_key()
    cursor = db.players.find(
        {"weekly.week": wk}, {"_id": 0, "id": 1, "username": 1, "weekly": 1}
    )
    rows = await cursor.to_list(length=500)
    ranked = sorted(
        [
            {"id": r["id"], "username": r["username"], "weekly_score": r.get("weekly", {}).get("score", 0)}
            for r in rows
        ],
        key=lambda x: x["weekly_score"],
        reverse=True,
    )[:20]
    champion = ranked[0] if ranked else None
    return {
        "week": wk,
        "resets_on": next_monday_iso(),
        "champion": champion,
        "leaderboard": ranked,
    }


@api_router.get("/coin-packs")
async def coin_packs():
    # Display metadata only. Real prices come from the store via RevenueCat.
    return {
        "packs": [
            {"product_id": "coins_500", "coins": 500, "fallback_price": "$0.99", "emoji": "🪙"},
            {"product_id": "coins_1200", "coins": 1200, "fallback_price": "$2.99", "emoji": "💰", "best_value": False},
            {"product_id": "coins_3000", "coins": 3000, "fallback_price": "$4.99", "emoji": "🤑", "best_value": True},
        ]
    }


@api_router.get("/bell-packs")
async def bell_packs():
    return {
        "packs": [
            {"product_id": "bells_5", "bells": 5, "fallback_price": "$0.99", "emoji": "🔔"},
            {"product_id": "bells_20", "bells": 20, "fallback_price": "$2.99", "emoji": "🔔", "best_value": False},
            {"product_id": "bells_50", "bells": 50, "fallback_price": "$4.99", "emoji": "🛎️", "best_value": True},
        ]
    }


@api_router.post("/players/{player_id}/spend-bells")
async def spend_bells(player_id: str, payload: SpendBells):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    amount = max(1, int(payload.amount))
    if doc.get("bells", 0) < amount:
        raise HTTPException(status_code=400, detail="Not enough Liberty Bells")
    new_bells = doc["bells"] - amount
    await db.players.update_one({"id": player_id}, {"$set": {"bells": new_bells}})
    doc["bells"] = new_bells
    return player_public(doc)


@api_router.get("/players/{player_id}/daily-reward")
async def daily_reward_status(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    today = today_iso()
    last = doc.get("last_reward_date")
    streak = doc.get("daily_streak", 0)
    claimable = last != today
    # Prospective streak if they claim now (streak breaks unless claimed yesterday).
    if last is None:
        next_streak = 1
    else:
        last_date = datetime.fromisoformat(last).date()
        today_date = datetime.now(timezone.utc).date()
        gap = (today_date - last_date).days
        if gap == 0:
            next_streak = streak  # already claimed today
        elif gap == 1:
            next_streak = streak + 1
        else:
            next_streak = 1
    reward = daily_reward_for(next_streak if claimable else max(1, streak))
    return {
        "claimable": claimable,
        "streak": streak,
        "next_streak": next_streak,
        "reward": reward,
        "cycle": DAILY_REWARDS,
    }


@api_router.post("/players/{player_id}/claim-daily-reward")
async def claim_daily_reward(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    today = today_iso()
    last = doc.get("last_reward_date")
    if last == today:
        raise HTTPException(status_code=400, detail="Already claimed today")
    streak = doc.get("daily_streak", 0)
    if last is None:
        new_streak = 1
    else:
        gap = (datetime.now(timezone.utc).date() - datetime.fromisoformat(last).date()).days
        new_streak = streak + 1 if gap == 1 else 1
    reward = daily_reward_for(new_streak)
    await db.players.update_one(
        {"id": player_id},
        {
            "$inc": {"coins": reward["coins"], "bells": reward["bells"]},
            "$set": {"daily_streak": new_streak, "last_reward_date": today},
        },
    )
    updated = await db.players.find_one({"id": player_id}, {"_id": 0})
    return {"reward": reward, "streak": new_streak, "player": player_public(updated)}


@api_router.post("/players/{player_id}/served-fan")
async def served_fan(player_id: str, payload: dict = Body(...)):
    team = payload.get("team")
    if not team:
        raise HTTPException(status_code=400, detail="team required")
    await db.players.update_one({"id": player_id}, {"$inc": {f"fan_served.{team}": 1}})
    return {"ok": True}


def _daily_goal_view(doc: dict) -> dict:
    today = today_iso()
    goal = daily_goal_def(today)
    dg = doc.get("daily_goal", {})
    if dg.get("date") != today:
        progress, claimed = 0, False
    else:
        progress, claimed = int(dg.get("progress", 0)), bool(dg.get("claimed", False))
    completed = progress >= goal["target"]
    return {
        "goal": goal,
        "progress": min(progress, goal["target"]),
        "target": goal["target"],
        "completed": completed,
        "claimed": claimed,
        "claimable": completed and not claimed,
        "streak": int(doc.get("goal_streak", 0)),
    }


@api_router.get("/players/{player_id}/daily-goal")
async def daily_goal_status(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    return _daily_goal_view(doc)


@api_router.post("/players/{player_id}/daily-goal-progress")
async def daily_goal_progress(player_id: str, payload: dict = Body(...)):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    today = today_iso()
    goal = daily_goal_def(today)
    dg = doc.get("daily_goal", {})
    if dg.get("date") != today:
        dg = {"date": today, "progress": 0, "claimed": False}
    inc = int(payload.get(goal["metric"], 0) or 0)
    if inc > 0 and not dg.get("claimed"):
        dg["progress"] = int(dg.get("progress", 0)) + inc
    await db.players.update_one({"id": player_id}, {"$set": {"daily_goal": dg}})
    doc["daily_goal"] = dg
    return _daily_goal_view(doc)


@api_router.post("/players/{player_id}/claim-daily-goal")
async def claim_daily_goal(player_id: str):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    today = today_iso()
    goal = daily_goal_def(today)
    dg = doc.get("daily_goal", {})
    if dg.get("date") != today or int(dg.get("progress", 0)) < goal["target"]:
        raise HTTPException(status_code=400, detail="Goal not complete")
    if dg.get("claimed"):
        raise HTTPException(status_code=400, detail="Already claimed")
    # Consecutive-day claim streak: +1 if claimed yesterday, else reset to 1.
    yesterday = (datetime.fromisoformat(today) - timedelta(days=1)).date().isoformat()
    prev_streak = int(doc.get("goal_streak", 0))
    last_claim = doc.get("goal_last_claim")
    streak = prev_streak + 1 if last_claim == yesterday else 1
    streak_bonus = min(streak, 7) * 20  # +20 per day, capped at +140 (7 days)
    total_reward = goal["reward"] + streak_bonus
    dg["claimed"] = True
    await db.players.update_one(
        {"id": player_id},
        {
            "$inc": {"coins": total_reward},
            "$set": {"daily_goal": dg, "goal_streak": streak, "goal_last_claim": today},
        },
    )
    updated = await db.players.find_one({"id": player_id}, {"_id": 0})
    return {
        "reward": total_reward,
        "base_reward": goal["reward"],
        "streak_bonus": streak_bonus,
        "streak": streak,
        "player": player_public(updated),
    }


@api_router.post("/players/{player_id}/jersey-math")
async def jersey_math_reward(player_id: str, payload: dict = Body(...)):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    correct = max(0, min(10, int(payload.get("correct", 0) or 0)))
    wrong = max(0, min(10, int(payload.get("wrong", 0) or 0)))
    # More than 3 wrong: flat 10-coin consolation. Otherwise 10 coins per correct.
    coins_awarded = 10 if wrong > 3 else 10 * correct
    await db.players.update_one({"id": player_id}, {"$inc": {"coins": coins_awarded}})
    updated = await db.players.find_one({"id": player_id}, {"_id": 0})
    return {"coins_awarded": coins_awarded, "correct": correct, "wrong": wrong, "player": player_public(updated)}


@api_router.post("/players/{player_id}/eagles-match")
async def eagles_match_reward(player_id: str, payload: dict = Body(...)):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    completed = bool(payload.get("completed", False))
    misses = max(0, min(20, int(payload.get("misses", 0) or 0)))
    # All 10 pairs matched with 3 or fewer misses: 100 - 10 per miss.
    # More than 3 misses, or ran out of time (not completed): 5-coin consolation.
    if completed and misses <= 3:
        coins_awarded = 100 - 10 * misses
    else:
        coins_awarded = 5
    await db.players.update_one({"id": player_id}, {"$inc": {"coins": coins_awarded}})
    updated = await db.players.find_one({"id": player_id}, {"_id": 0})
    return {"coins_awarded": coins_awarded, "completed": completed, "misses": misses, "player": player_public(updated)}


@api_router.post("/players/{player_id}/hockey-shootout")
async def hockey_shootout_reward(player_id: str, payload: dict = Body(...)):
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Player not found")
    goals = max(0, min(10, int(payload.get("goals", 0) or 0)))
    coins_awarded = 10 * goals  # 10 coins per goal, no win/lose
    await db.players.update_one({"id": player_id}, {"$inc": {"coins": coins_awarded}})
    updated = await db.players.find_one({"id": player_id}, {"_id": 0})
    return {"coins_awarded": coins_awarded, "goals": goals, "player": player_public(updated)}


@api_router.post("/revenuecat/webhook")
async def revenuecat_webhook(request: Request, authorization: str | None = Header(default=None)):
    expected = os.environ.get("REVENUECAT_WEBHOOK_AUTH")
    # If a secret is configured, require it. (Placeholder until keys are set post-deploy.)
    if expected and (not authorization or authorization != expected):
        raise HTTPException(status_code=401, detail="invalid webhook authorization")

    payload = await request.json()
    event = payload.get("event", {})
    if event.get("type") != "NON_RENEWING_PURCHASE":
        return {"ok": True, "ignored": event.get("type")}

    player_id = event.get("app_user_id")
    product_id = event.get("product_id")
    transaction_id = event.get("transaction_id")
    event_id = event.get("id")
    if not all(isinstance(x, str) and x for x in (player_id, product_id, transaction_id, event_id)):
        raise HTTPException(status_code=400, detail="incomplete purchase event")

    is_coins = product_id in PRODUCT_COINS
    is_bells = product_id in PRODUCT_BELLS
    if not (is_coins or is_bells):
        raise HTTPException(status_code=400, detail="unknown product")

    amount = PRODUCT_COINS[product_id] if is_coins else PRODUCT_BELLS[product_id]
    currency = "coins" if is_coins else "bells"
    # Idempotent: insert the transaction first; duplicates are ignored.
    existing = await db.rc_purchases.find_one({"transaction_id": transaction_id})
    if existing:
        return {"ok": True, "duplicate": True}
    await db.rc_purchases.insert_one({
        "event_id": event_id,
        "transaction_id": transaction_id,
        "player_id": player_id,
        "product_id": product_id,
        "currency": currency,
        "amount": amount,
        "store": event.get("store"),
        "environment": event.get("environment"),
    })
    await db.players.update_one({"id": player_id}, {"$inc": {currency: amount}})
    return {"ok": True, "granted": amount, "currency": currency}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
