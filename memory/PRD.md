# Philly Fare Match — PRD

## Concept
Bright, Philadelphia-sports-themed match-3 + storefront cooking game. Phase 1: swap ingredient tiles to collect a dish's base recipe. Phase 2: a Cooking-Fever-style counter where customers order dish variants (with/without toppings) that you assemble & serve against a patience timer.

## User Choices (cumulative)
- Match-3 swap gameplay; full Philly dish set; level + coin progression; backend leaderboard; bright cartoon emoji art.
- Two-phase play (match then serve storefront) with per-customer variant orders.
- Combos, Bigger Grill, Daily Special.
- Streak jackpot, Ingredient Pantry, Weekly Tournament.
- Monetization: real-money COIN PACKS via Emergent-managed RevenueCat (freemium). Coin-spend upgrades: Serving Plates + Bigger Holding Area.
- Theme: Philadelphia sports colors (Eagles midnight green, Flyers orange, Phillies red, Sixers blue, kelly green).

## Screens
Onboarding, Home (daily special banner, tappable coin chip → coin store, Rush/Shop/Ranks/Levels), Level Map, Game (match-3), Serve (storefront w/ combo meter, pantry shelf, jackpot), Cooking Result, Shop (4 upgrades + boosters + get-coins), Coin Store (RevenueCat packs), Rush (endless 3-lives), Leaderboard (All-Time + Weekly Cup), Profile (crown badge).

## Backend (FastAPI + MongoDB)
- Dishes, shop, players CRUD, complete-level (coins/score/unlock/weekly), purchase/use-booster (consumables).
- Upgrades: generic `/players/{id}/upgrade/{key}` for grill|pantry|plates|holding; `/upgrades-info/{id}`; grill/pantry info; pantry save w/ capacity = pantry_level + holding_level*2.
- Daily special (rotates by UTC day, 2x coins).
- Leaderboards: all-time + weekly (ISO week, resets Monday, champion crown + 500-coin prize via settle-on-read, idempotent `champions` collection).
- Monetization: `/coin-packs`; `/revenuecat/webhook` (NON_RENEWING_PURCHASE → idempotent coin grant via `rc_purchases`). Product map: coins_500/1200/3000.

## Env / Keys (to set before publishing)
- frontend/.env: EXPO_PUBLIC_RC_IOS_KEY, EXPO_PUBLIC_RC_ANDROID_KEY (RevenueCat public SDK keys).
- backend/.env: REVENUECAT_WEBHOOK_AUTH (shared secret; also set as the Authorization header in RevenueCat webhook config). Empty in preview = open for testing.
- IAP only works on a published native build (not Expo Go / web).

## Testing
- Iteration 5: 40/40 backend pytest passing; all frontend flows verified. No auth (anonymous UUID player).

## Backlog / Next
- P1: combo meter numeric tiers polish; pantry auto-stock indicator; champion prize claim popup.
- P2: cups/drinks upgrade; ads/remove-ads pass; starter bundle IAP.

## Update (Jun 2026) — Icons + 4 features
- 4 features shipped & tested (iteration_8): combo sparkle burst on perfect serve, level star ratings (1-3, stored per level in player.stars), first-time Soft Pretzel tutorial (AsyncStorage flag_tutorial_pretzel), daily reward streak in Shop (7-day cycle, GET/POST /api/players/{id}/daily-reward[-claim], UTC-day idempotent).
- Real-image icons unified app-wide via DishIcon/component swap: soft_pretzel photo (assets/soft_pretzel.jpeg), roast_pork photo (assets/roast_pork.jpeg), Liberty Bell PNG (assets/liberty_bell.png), Rocky statue line-art (assets/rocky_statue.jpeg), City Hall/William Penn photo (assets/cityhall_penn.webp) — all in circular white chips. LOVE sculpture redrawn as red stacked LO/VE with tilted O + blue depth + black base (View/Text, no SVG).
- Backend DISH_CATALOG recipe field synced to 5 base ingredients per level (matches frontend FALLBACK_DISHES).

- Water Ice icon = real striped-cup photo (assets/water_ice.png) via DishIcon/WaterIce component.
- customers_per_level set to 10 for all 7 dishes (dishes.ts). Serve completion threshold = served >= ceil(customers/2).

- Photo icons wired via IngredientIcon: cheese_sauce, american(+american_melt), pizza_sauce (assets/*.jpg), plus mustard(SVG bottle) & cinnamon(SVG sticks). Levels 8-12 added (scrapple_ec, seasoned_fries, tomato_pie, porkroll_ec, donuts) in dishes.ts + backend catalog (12 dishes).

- Icons: ketchup(KetchupBottle SVG), egg/scrapple/porkroll (FoodIcons SVG), donut flavors (Donut SVG w/ glaze color + sprinkles) wired via IngredientIcon; donuts dish icon in DishIcon. Level-map now shows dish icon on locked cards (dimmed + lock badge). Random ~25% Philly sports-fan customer (team emoji jersey badge + "Philly fan!" tag) in serve.tsx buildCustomers.

- Level order changed: Donuts moved to Lvl 4; American Hoagie..Pork Roll shifted +1 (now 5..12). unlock_level updated in dishes.ts + server.py; level-map sorts by unlock_level. Backend unlock keyed on unlock_level so chain intact.

- Cake/pie photo icons wired (pb_cake, butterscotch_cake, chocolate_cake, mini_pie=glazed, apple_pie) + dish photos (american_hoagie, italian_hoagie, tomato_pie). happy_cakes topping cherry->apple_pie. Salt&Pepper twin-shaker SVG + Seasoning shaker. Fan streak bonus (25*streak coins, resets on miss/timeout) + team chant. NOTE: real team logos declined (copyright); using team colors/jersey. Skyline bg pending real asset (fries webp was watermarked AI content).
