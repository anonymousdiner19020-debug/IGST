# Philly Fare Match — PRD

## Concept
A bright, cartoon match-3 puzzle game themed around Philadelphia food classics. Players swap adjacent ingredient tiles to create matches of 3+; each cleared ingredient fills the current customer order. Complete an order (e.g., 4 steaks + 3 onions + 3 cheeses + 2 rolls = Cheesesteak) before running out of moves to serve the dish and earn coins.

## User Choices
- Gameplay: Match-3 (swap adjacent tiles)
- Dishes: Full Philly catalog (8 dishes)
- Progression: Level-based unlocks + coin economy
- Storage: Backend with global leaderboard (anonymous player UUID)
- Art: Bright cartoon/emoji-icon style

## Screens
1. **Onboarding** — enter Chef name, creates player.
2. **Home** — hero, coin balance, Play, Levels, Shop, Ranks, Profile.
3. **Level Map** — vertical staggered node path for the 8 Philly dishes (locked/current/done states).
4. **Game** — HUD (moves, score), 7x7 match-3 board, sticky order card + recipe chip row.
5. **Cooking Result** — celebratory modal, coins earned, next dish preview.
6. **Shop** — 5 consumable boosters (extra moves, hint, coin doubler, hammer, shuffle).
7. **Leaderboard** — Top 20 chefs by high score.
8. **Profile** — stats grid + unlocked dish gallery + reset.

## Backend (FastAPI + MongoDB)
- `GET /api/dishes` — dish catalog
- `GET /api/shop` — shop items
- `POST /api/players` — create player (starting 100 coins, cheesesteak unlocked)
- `GET /api/players/:id` — fetch player
- `POST /api/players/:id/complete-level` — record score, add coins, unlock next dish
- `POST /api/players/:id/purchase` — buy shop item
- `POST /api/players/:id/use-booster` — decrement booster count
- `GET /api/leaderboard` — top 20 by high_score

## Dishes (unlock order)
1. Philly Cheesesteak — steak/onion/cheese/roll
2. Soft Pretzel — dough/salt/mustard
3. Water Ice — ice/cherry/lemon
4. Italian Hoagie — roll/ham/cheese/lettuce
5. Roast Pork Sandwich — pork/broccoli/provolone/roll
6. Tomato Pie — dough/tomato/basil/cheese
7. Scrapple — pork/cornmeal/sage/egg
8. Tastykake — flour/sugar/chocolate/cream

## Business Enhancement
Coin economy + shop already monetization-ready: shop consumables can later be tied to IAP or ad rewards. Global leaderboard drives retention.
