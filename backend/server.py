from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Static Philly Dish Catalog ----------
DISH_CATALOG = [
    {
        "id": "cheesesteak",
        "name": "Philly Cheesesteak",
        "emoji": "🥩",
        "unlock_level": 1,
        "recipe": {"steak": 4, "onion": 3, "cheese": 3, "roll": 2},
        "reward_coins": 50,
        "moves": 22,
    },
    {
        "id": "soft_pretzel",
        "name": "Soft Pretzel",
        "emoji": "🥨",
        "unlock_level": 2,
        "recipe": {"dough": 4, "salt": 3, "mustard": 2},
        "reward_coins": 60,
        "moves": 20,
    },
    {
        "id": "water_ice",
        "name": "Water Ice",
        "emoji": "🍧",
        "unlock_level": 3,
        "recipe": {"ice": 5, "cherry": 3, "lemon": 3},
        "reward_coins": 70,
        "moves": 20,
    },
    {
        "id": "hoagie",
        "name": "Italian Hoagie",
        "emoji": "🥖",
        "unlock_level": 4,
        "recipe": {"roll": 3, "ham": 3, "cheese": 3, "lettuce": 2},
        "reward_coins": 80,
        "moves": 22,
    },
    {
        "id": "roast_pork",
        "name": "Roast Pork Sandwich",
        "emoji": "🥓",
        "unlock_level": 5,
        "recipe": {"pork": 4, "broccoli": 3, "provolone": 3, "roll": 3},
        "reward_coins": 100,
        "moves": 24,
    },
    {
        "id": "tomato_pie",
        "name": "Tomato Pie",
        "emoji": "🍕",
        "unlock_level": 6,
        "recipe": {"dough": 4, "tomato": 4, "basil": 3, "cheese": 3},
        "reward_coins": 110,
        "moves": 24,
    },
    {
        "id": "scrapple",
        "name": "Scrapple",
        "emoji": "🍳",
        "unlock_level": 7,
        "recipe": {"pork": 4, "cornmeal": 4, "sage": 3, "egg": 3},
        "reward_coins": 130,
        "moves": 26,
    },
    {
        "id": "tastykake",
        "name": "Tastykake",
        "emoji": "🧁",
        "unlock_level": 8,
        "recipe": {"flour": 4, "sugar": 4, "chocolate": 4, "cream": 3},
        "reward_coins": 150,
        "moves": 26,
    },
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
DAILY_BONUS_MULTIPLIER = 2.0


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
    completed: bool  # True if order fulfilled


class PurchaseRequest(BaseModel):
    item_id: str


def player_public(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "username": doc["username"],
        "coins": doc.get("coins", 0),
        "high_score": doc.get("high_score", 0),
        "current_level": doc.get("current_level", 1),
        "dishes_cooked": doc.get("dishes_cooked", 0),
        "unlocked_dishes": doc.get("unlocked_dishes", ["cheesesteak"]),
        "boosters": doc.get("boosters", {}),
        "grill_level": doc.get("grill_level", 0),
        "created_at": doc.get("created_at", ""),
    }


def grill_cost(level: int) -> int:
    return GRILL_BASE_COST * (level + 1)


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Philly Fare Match API"}


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
        "high_score": 0,
        "current_level": 1,
        "dishes_cooked": 0,
        "unlocked_dishes": ["cheesesteak"],
        "boosters": {"extra_moves": 0, "hint": 1, "coin_doubler": 0, "hammer": 0, "shuffle": 1},
        "grill_level": 0,
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
    high_score = max(doc.get("high_score", 0), result.score)
    dishes_cooked = doc.get("dishes_cooked", 0) + (1 if result.completed else 0)
    unlocked = list(doc.get("unlocked_dishes", ["cheesesteak"]))
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
        "high_score": high_score,
        "dishes_cooked": dishes_cooked,
        "unlocked_dishes": unlocked,
        "current_level": current_level,
    }
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
