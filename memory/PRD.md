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

- Update (Jun 2026) — Hoagie ingredient photo icons + Recipe Variety:
  - Photo icons wired via IngredientIcon: ham (assets/ham.jpg), salami (assets/salami.jpg), bologna (assets/bologna.jpeg), oil (oil & vinegar cruet set, assets/oil_vinegar.webp — replaced earlier SVG). Fixed a syntax error (orphaned JSX + dup export) in IngredientIcon.tsx that had broken the app bundle.
  - Recipe Variety / Special Orders: each dish has a `special_options` array (2 rare extras) in dishes.ts. serveOptions() now includes specials so they render in the serve tray. generateCustomerOrder(dish, rand, special) adds one special item to `wanted` when special=true. buildCustomers() rolls ~22% chance per customer for a special order (excluded from the everyday topping pool; disabled during cheesesteak rivalry rounds). Ticket shows a "⭐ SPECIAL ORDER • BONUS TIP!" badge and highlights the special row; perfect serve awards +50 bonus coins. New special ingredients added to INGREDIENTS (honey_mustard, garlic_butter, whipped_cream, caramel, rainbow_syrup, powdered_sugar, jelly, pickle, roasted_pepper, gravy, hot_sauce, bacon_bits, ranch, extra_cheese, hash_brown) — emoji fallback icons.

- Update (Jun 2026) — VIP customers, daily-goal streak, Jersey Math bonus:
  - VIP customers (serve.tsx): ~10% of serve customers are 💎 VIP big-tippers (excludes fan/special). Ticket shows "💎 VIP • DOUBLE TIP • HURRY!"; perfect serve doubles coin tip AND bell tip; patience ~40% shorter (pMs=patienceMs*0.6).
  - Daily Goal (backend server.py): rotating goal per UTC day (DAILY_GOALS pool of 5). claim-daily-goal tracks consecutive-day streak (player.goal_streak/goal_last_claim): +1 if last claim yesterday else reset to 1; streak_bonus=min(streak,7)*20 on top of goal.reward. Home shows Daily Challenge card (progress bar, CLAIM, "🔥 N-day streak" chip) + 🎁 badge on PLAY button when claimable. serve.tsx reports progress via api.reportDailyGoal at level end.
  - Jersey Math bonus mini-game (frontend/app/jersey-math.tsx, route in _layout.tsx): after winning Level 3 (cooking-result routes continue -> /jersey-math when retryLevel===3, shows bonus-banner). 10 equations (+/- small numbers) "a op b = ?" with 6 Phillies-red FanJersey options (one correct + 5 distractors 0-25); 10s countdown per equation, timeout=wrong. Reward via POST /players/{id}/jersey-math {correct,wrong}: wrong>3 => flat 10 coins; else 10*correct. Result -> Continue -> /level-map.

- Update (Jun 2026) — Mini 2: Eagles jersey memory match (frontend/app/eagles-match.tsx, src/components/JerseyBack.tsx, route in _layout.tsx): appears after winning Level 6 (cooking-result routes -> /eagles-match). 20 tiles = 10 pairs from a 30-player Eagles roster (number:name, in-file ROSTER). Kelly-green (#128A3C) JerseyBack shows player NAME above big white number outlined black. 45s timer. Flip two tiles; same number = matched pair; different = miss (+1) and flip back. Reward via POST /players/{id}/eagles-match {completed,misses}: completed && misses<=3 => 100-10*misses; else (misses>3 OR timeout) => 5 coins. Mini 1 (jersey-math) after Level 3 uses Phillies powder-blue (#79BDEE) FanJersey backs with red numbers outlined white.

## Update (session): Mini 4 + content/UX changes
- Mini 4 "76ers Word Search" (route /word-search): 12x12 grid, 5 random surnames from a 16-name Sixers pool, horizontal/vertical/diagonal placement, no timer, 100 coins for finding all 5. Backend: POST /api/players/{id}/word-search. Unlocks after Level 10 (cooking-result routing). 76ers colors (#006BB6 blue, #ED174C red, #002B5C navy).
- New serving levels: 15 Sweet Treats Box, 16 Fruit Pierogies, 17 Candy Shop. Philly Candy Box (13) now uses only Peanut Chews/Irish Potatoes/Whitmans/Peeps/Candy Corn.
- Pork Roll Egg & Cheese (12): bread removed; base = porkroll, egg, cheese, ketchup, hash_brown.
- Long Hots ingredient recolored green (🫑). Icon consistency: rush.tsx now uses IngredientIcon (same icons as levels everywhere).
- Match-3 board tiles show ingredient name under each icon (2 lines).
- Serving screen: larger tray icons/squares (labels fit), 20s timer, 3.5s pause after correct serve. Fan Rush bar moved below top HUD.
- Mini 2 fix: functional setMatched + refs so rapid taps never leave unmatched jerseys; timer 50s. Mini 7 timer 90s.
- All mini-games (1,2,3,7 and new 4) show a shared HowToPlay overlay that pauses timers until dismissed.
- Mini 3: goalie moves randomly; goal plays horn sound, save plays boo (native audio requires a build to fully verify).
