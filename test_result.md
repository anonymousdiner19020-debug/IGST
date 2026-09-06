#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
user_problem_statement: "Philly Food Frenzy - Philadelphia match-3 + storefront cooking game. Match ingredients (now 5 base items per level) then serve customers custom orders. Coins + Liberty Bells currency, upgrades, tournament, Rush mode, RevenueCat packs."

backend:
  - task: "Dish catalog 5-ingredient recipe sync"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Updated DISH_CATALOG recipe field for all 7 dishes to 5 base ingredients each to match frontend FALLBACK_DISHES base_recipe. Verified via /api/dishes curl - all 7 return 5-key recipes."

frontend:
  - task: "Match phase 5 base ingredients + serve flow"
    implemented: true
    working: "NA"
    file: "frontend/app/game.tsx, frontend/src/constants/dishes.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "All 7 levels now use 5 base match ingredients. Board palette caps at 8 tile types (5 base always + up to 3 toppings) on 7x7 board. Screenshot of Level 1 confirms 5 requirement chips render 0/2 each. New Liberty Bell icon renders across pages."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 7
  run_ui: true

test_plan:
  current_focus:
    - "Dish catalog 5-ingredient recipe sync"
    - "Match phase 5 base ingredients + serve flow"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Synced backend catalog to 5-ingredient recipes (was stale 2-item). Please retest: (1) backend /api/dishes returns 5-key recipes for all 7 dishes and level-complete/currency flows still work; (2) frontend match phase collects all 5 base ingredients and transitions to serve counter, serve->result flow works. Anonymous UUID player (no auth). Backend URL from EXPO_PUBLIC_BACKEND_URL."

## ---- Iteration 8: 4 new features + icon updates ----
backend:
  - task: "Daily reward streak endpoints"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added GET /players/{id}/daily-reward (status + 7-day cycle) and POST /players/{id}/claim-daily-reward (idempotent per UTC day, streak increments if consecutive day else resets). Curl verified: claim grants day-1 25 coins, second claim same day returns 400, streak tracked."
  - task: "Level star ratings storage"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "LevelResult gains stars (0-3). complete-level stores best stars per level in player.stars dict. Curl verified stars={'1':3} after completing level 1 with stars=3."

frontend:
  - task: "Combo celebration sparkle burst"
    implemented: true
    working: "NA"
    file: "frontend/src/components/SparkleBurst.tsx, frontend/app/serve.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "SparkleBurst animated overlay (ring + radiating sparkles + PERFECT! text) fires on each perfect serve via sparkle state counter in serve.tsx."
  - task: "Star rating display (result + level map)"
    implemented: true
    working: "NA"
    file: "frontend/app/cooking-result.tsx, frontend/app/level-map.tsx, frontend/app/serve.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "serve computes stars (all-perfect=3, >=60% =2, any win=1), passes to backend + result screen. cooking-result shows 3-star row; level-map shows earned stars under each unlocked node."
  - task: "First-time pretzel tutorial"
    implemented: true
    working: "NA"
    file: "frontend/app/game.tsx, frontend/src/storage.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "3-step tutorial overlay shows only on soft_pretzel first play, dismissed via flagStorage (AsyncStorage flag_tutorial_pretzel)."
  - task: "Daily reward card in shop"
    implemented: true
    working: "NA"
    file: "frontend/app/shop.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Shop shows Daily Reward card with streak, 7-day cycle dots, and CLAIM button. Requires onboarded player. Backend verified via curl."
  - task: "Unified icons (pretzel photo, liberty bell PNG, LOVE sculpture)"
    implemented: true
    working: "NA"
    file: "frontend/src/components/SoftPretzel.tsx, LibertyBell.tsx, LandmarkIcons.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "SoftPretzel now renders real pretzel photo in white circular chip (used via DishIcon everywhere incl serve/rush ticket+plate). LibertyBell renders transparent PNG everywhere. LoveStatue redrawn as red stacked LO/VE with tilted O + blue depth + black base."

agent_communication:
    - agent: "main"
      message: "Iteration 8: implemented 4 features (combo sparkle burst, level star ratings, first-time pretzel tutorial, daily reward streak in shop) + unified 3 icons (pretzel photo, liberty bell PNG, LOVE sculpture). Please test both backend (daily-reward status/claim idempotency + streak, complete-level stars persistence) and frontend flows: onboard a player, play soft_pretzel (tutorial overlay appears + dismiss), match 5 ingredients -> serve counter -> perfect serve shows sparkle burst -> cooking-result shows star rating -> level-map shows earned stars; shop shows Daily Reward card and CLAIM grants coins then disables. Anonymous UUID player (create via username input on home). Backend URL from EXPO_PUBLIC_BACKEND_URL."

## ---- Iteration 9: board/icons + 4 gameplay features ----
frontend:
  - task: "Board uses only base ingredients + pretzel photo tiles"
    implemented: true
    working: "NA"
    file: "frontend/app/game.tsx, frontend/src/components/IngredientIcon.tsx"
    status_history:
        - working: "NA"
          agent: "main"
          comment: "buildPalette now returns only base_recipe keys (no topping tiles). Dough tiles + recipe chip render real pretzel photo via IngredientIcon."
  - task: "All ingredients available as serve options + cinnamon sticks icon"
    implemented: true
    working: "NA"
    file: "frontend/app/serve.tsx, frontend/src/constants/dishes.ts, frontend/src/components/CinnamonSticks.tsx"
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added serveOptions(dish) = base keys + toppings minus bread/cup carriers. game.tsx passes it to serve; serve falls back to it when empty. Tray/ticket/plate use IngredientIcon (cinnamon_sauce -> CinnamonSticks SVG, dough -> pretzel photo)."
  - task: "Progress milestone cheer + customer mood/anger + perfect-run bonus"
    implemented: true
    working: "NA"
    file: "frontend/app/serve.tsx, frontend/app/cooking-result.tsx"
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Halfway milestone overlay at ceil(total/2) perfect serves. Mood emoji (happy/neutral/angry) by patience. Patience shrinks per level (max(7000,15000-(lvl-1)*1100)). Perfect run (all served, 0 misses) adds total*20 coins, shown on cooking-result perfect-bonus banner."
  - task: "Landmark unlock gallery"
    implemented: true
    working: "NA"
    file: "frontend/app/gallery.tsx, frontend/app/_layout.tsx, frontend/app/index.tsx"
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New /gallery screen: 4 landmark badges (LOVE, Liberty Bell, City Hall, Rocky) unlock by levels beaten (1/2/4/6). Home Badges button added."

agent_communication:
    - agent: "main"
      message: "Iteration 9. Board now only shows 5 base ingredients (pretzel dough as photo). Serve tray shows ALL ingredients (base sauces + toppings, no bread carrier), cinnamon uses custom stick icon. Added milestone cheer, angry customer faces + faster patience on later levels, perfect-run coin bonus, and a Landmark Badges gallery. Please test frontend: (1) game board only has base ingredients and completes to serve; (2) serve tray lists all ingredients and orders are fulfillable; (3) serve a perfect run and confirm cooking-result shows Perfect Run bonus + stars; (4) /gallery renders 4 badges with lock states; (5) home Badges button navigates to gallery. Backend unchanged this iteration (perfect bonus is added client-side to coins_earned in existing complete-level). Anonymous UUID player via home onboarding."

## ---- Iteration 10: levels 8-12 + mustard icon ----
backend:
  - task: "Levels 8-12 in DISH_CATALOG"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added scrapple_ec, seasoned_fries, tomato_pie, porkroll_ec, donuts to DISH_CATALOG. /api/dishes returns 12 dishes. Level 8-12 unlock chain via complete-level should work (current_level increments, unlocked_dishes appends)."
frontend:
  - task: "Levels 8-12 dishes + mustard bottle icon"
    implemented: true
    working: "NA"
    file: "frontend/src/constants/dishes.ts, frontend/src/components/MustardBottle.tsx, frontend/src/components/IngredientIcon.tsx"
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added 5 dishes to FALLBACK_DISHES with new ingredients (scrapple, egg, long_roll, round_roll, salt_pepper, ketchup, porkroll, potato, american_melt, cheddar_melt, small_cup, seasoning, olive_oil, basil, vanilla/chocolate/strawberry donut). CARRIERS extended with long_roll/round_roll/small_cup. Mustard now renders custom MustardBottle SVG via IngredientIcon (board tiles, recipe chips, serve tray/ticket/plate). Verified board mustard tiles + tomato_pie serve options render."
agent_communication:
    - agent: "main"
      message: "Iteration 10: added levels 8-12 (Scrapple E&C, Seasoned Fries, Tomato Pie, Pork Roll E&C, Donuts) with their ingredients, and replaced mustard emoji with a custom cartoon mustard-bottle SVG everywhere. Please test: (1) backend /api/dishes returns 12 dishes; complete-level unlock chain works up through level 12; (2) frontend level-map shows all 12 levels; (3) each new level's game board shows only its base ingredients and completes to serve; (4) each new level's serve tray shows all non-carrier ingredients and orders are fulfillable; (5) mustard renders as a bottle icon (not emoji) on board tiles, recipe chips and serve tray. Anonymous UUID player via home onboarding."

## ---- Iteration 11: onboarding skyline legibility fix + more photo icons ----
frontend:
  - task: "Onboarding legibility (title over skyline)"
    implemented: true
    working: "NA"
    file: "frontend/app/index.tsx"
    status_history:
        - working: "NA"
          agent: "main"
          comment: "BUG FIX: title was unreadable on the skyline background. Onboarding now uses ImageBackground(philly_skyline.jpg) with justifyContent flex-end so the skyline sits at top and content (icons/title/subtitle/input/Start Cooking) sits in the darker lower area. Title/subtitle now white with text shadow. Overlay rgba(2,20,24,0.55)."
  - task: "Additional photo ingredient/dish icons"
    implemented: true
    working: "NA"
    file: "frontend/src/components/IngredientIcon.tsx, frontend/src/components/DishIcon.tsx"
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Wired photo icons: sprinkles, rootbeer (water_ice), pb_cake/butterscotch_cake/chocolate_cake/mini_pie/apple_pie (happy_cakes), dish photos american_hoagie/italian_hoagie/tomato_pie/seasoned_fries. happy_cakes chocolate_sauce removed (topping_options=['apple_pie']). Salt&pepper + seasoning shaker SVGs. Fan streak bonus (25*streak, resets on miss/timeout) + team chant."
agent_communication:
    - agent: "main"
      message: "Iteration 11. PRIMARY: verify onboarding legibility bug fix - on the first-launch onboarding screen (fresh player, no stored id), the 'Philly Food Frenzy' title + subtitle + 'Chef name' input + 'Start Cooking' button must be clearly readable in the lower area BELOW the skyline photo (not overlapping/washed out on the skyline). ALSO verify no regressions: (a) onboarding still creates a player and navigates to home; (b) water_ice serve shows the root beer photo icon; (c) happy_cakes serve tray no longer has a Chocolate(sauce) option (only Apple Pie topping); (d) serve/game screens for happy_cakes render the new cake/pie photo icons without crashing. Anonymous UUID player. To force onboarding, clear stored player. Deep-link serve e.g. /serve?dishId=water_ice&level=3&score=100&inventory=%7B%7D&movesLeft=10&daily=0."

## ---- Iteration 12: hoagie photo icons + Recipe Variety (special orders) + Daily Goal ----
backend:
  - task: "Daily Goal challenge endpoints"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New rotating daily challenge. DAILY_GOALS pool of 5 goals; daily_goal_def() picks one per UTC day by ordinal%5. Endpoints: GET /api/players/{id}/daily-goal (returns goal def + progress/target/completed/claimed/claimable, resets on new UTC day), POST /api/players/{id}/daily-goal-progress (body has counters special_served/customers_served/perfect_serves/levels_completed/fans_served; only the ACTIVE goal's metric is added to progress; ignored once claimed), POST /api/players/{id}/claim-daily-goal (grants goal.reward coins once; 400 if not complete or already claimed - idempotent). Verified via curl: today's goal=serve25 (customers_served target 25); progress only counted customers_served; claim added +120 coins; 2nd claim returns 400 'Already claimed'."
frontend:
  - task: "Recipe Variety - surprise special orders"
    implemented: true
    working: "NA"
    file: "frontend/src/constants/dishes.ts, frontend/app/serve.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Each dish has special_options[2] rare extras. serveOptions() now includes specials so they render as tappable tray buttons. generateCustomerOrder(dish,rand,special) adds one special item to wanted when special. buildCustomers() rolls ~22%/customer for a special order (specials excluded from normal wanted pool; disabled during cheesesteak rivalry). Ticket shows '⭐ SPECIAL ORDER • BONUS TIP!' badge + highlighted special row; perfect serve on a special adds +50 coins. New emoji-fallback ingredients added (honey_mustard, garlic_butter, whipped_cream, caramel, rainbow_syrup, powdered_sugar, jelly, pickle, roasted_pepper, gravy, hot_sauce, bacon_bits, ranch, extra_cheese, hash_brown). Verified via screenshot: american_hoagie shows badge + highlighted Hot Sauce + Pickles/Hot Sauce tray buttons; normal serving still works."
  - task: "Daily Goal card on Home + progress reporting"
    implemented: true
    working: "NA"
    file: "frontend/app/index.tsx, frontend/app/serve.tsx, frontend/src/api.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Home shows a Daily Challenge card (icon, label, +reward coins, progress bar progress/target, CLAIM button when claimable, '✓ Claimed' after). Loads via api.getDailyGoal on player load + 3s refresh. serve.tsx finishLevel reports counters via api.reportDailyGoal (special_served, customers_served=served, perfect_serves, levels_completed, fans_served) tracked with refs during the round. Claim calls api.claimDailyGoal and updates player coins. Verified via screenshot: card shows 'Serve 25 Customers +120 🪙' 0/25 'Keep serving!' for a fresh player."
  - task: "Hoagie photo ingredient icons (ham, salami, bologna, oil&vinegar)"
    implemented: true
    working: "NA"
    file: "frontend/src/components/IngredientIcon.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Photo icons wired: ham (ham.jpg), salami (salami.jpg), bologna (bologna.jpeg), oil (oil_vinegar.webp cruet set, replaced earlier SVG). Also fixed an orphaned-JSX syntax error in IngredientIcon.tsx that had broken the bundle. Screenshot-verified in american_hoagie serve tray + ticket."
agent_communication:
    - agent: "main"
      message: "Iteration 12. Test focus: (1) BACKEND daily-goal endpoints: GET returns today's goal+progress; POST daily-goal-progress only increments the active goal's metric and is a no-op after claim; claim grants reward once (idempotent, 400 when incomplete/already claimed); new UTC day resets progress. (2) FRONTEND special orders: on hoagie/other dishes, ~22% of serve customers show a gold '⭐ SPECIAL ORDER • BONUS TIP!' badge with a highlighted special item, tray includes the special extras as tappable buttons, and serving that order perfectly awards +50 (feedback shows '⭐ +50 🪙 special!'); normal (non-special) serving unaffected. (3) FRONTEND Daily Goal card on Home shows the challenge, progress bar, and after finishing a serve level the progress updates; when progress>=target a CLAIM button appears, claiming adds coins and shows '✓ Claimed'. Anonymous UUID player via home onboarding. Deep-link serve e.g. /serve?dishId=american_hoagie&level=5&score=100&inventory=%7B%7D&movesLeft=10&daily=0."

## ---- Iteration 13: VIP customers + daily-goal streak bonus + Play-button reminder ----
backend:
  - task: "Daily Goal claim streak bonus"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "claim-daily-goal now tracks a consecutive-day claim streak (player.goal_streak, player.goal_last_claim). If last claim was yesterday -> streak+1, else reset to 1. streak_bonus = min(streak,7)*20 (cap +140) added on TOP of goal.reward. Response returns {reward(total), base_reward, streak_bonus, streak, player}. GET daily-goal now also returns 'streak'. Verified via curl: fresh claim -> streak 1, bonus 20, total = base+20; direct-DB set last_claim=yesterday & prev streak 4 -> claim returned streak 5, bonus 100, total 250; idempotency still returns 400 'Already claimed'."
frontend:
  - task: "VIP big-tipper customers"
    implemented: true
    working: "NA"
    file: "frontend/app/serve.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "~10% of serve customers are VIPs (isVip roll; VIP excludes fan/special to keep tips clear). VIP ticket shows '💎 VIP • DOUBLE TIP • HURRY!' badge. On perfect serve, tip AND bell tip are doubled (vipMult=2) and feedback appends '💎 VIP double tip!'. Patience timer for a VIP customer is ~40% shorter (pMs = patienceMs*0.6). Screenshot-verified VIP badge renders on american_hoagie serve."
  - task: "Daily-goal streak chip + Play-button reminder badge"
    implemented: true
    working: "NA"
    file: "frontend/app/index.tsx, frontend/src/api.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Home goal card shows a '🔥 N-day streak' chip when streak>0 (and '+X bonus today!' when claimable). Claiming shows a temporary '+reward 🪙 claimed! (+X 🔥 streak)' message. A small red 🎁 badge (testID play-goal-badge) appears on the Home PLAY button whenever goal.claimable is true (challenge complete & ready to claim). api.claimDailyGoal/getDailyGoal types updated with streak fields."
agent_communication:
    - agent: "main"
      message: "Iteration 13. Test focus: (1) BACKEND claim streak: first claim of the day => streak=1, streak_bonus=20, reward=base+20; a second claim same day => 400 'Already claimed'; GET daily-goal returns 'streak'. (Consecutive-day increment already curl+DB verified: last_claim yesterday bumps streak and streak_bonus=min(streak,7)*20.) Ensure claim still 400s when progress<target. (2) FRONTEND VIP: on a serve screen (e.g. /serve?dishId=american_hoagie&level=5&score=100&inventory=%7B%7D&movesLeft=10&daily=0) reload several times (~10% chance) to find a customer whose ticket shows the '💎 VIP • DOUBLE TIP • HURRY!' badge (testID vip-tag); serving that customer perfectly should double the tip and the feedback should include 'VIP double tip'. VIP patience bar drains noticeably faster. (3) FRONTEND Home: after pushing a player's daily-goal progress to >=target via backend, the Home card shows the CLAIM button, a '🔥 N-day streak' chip appears after claiming, and a 🎁 badge (testID play-goal-badge) shows on the PLAY button while claimable. Anonymous UUID player via onboarding."

## ---- Iteration 14: Jersey Math bonus mini-game (between levels 3 & 4) ----
backend:
  - task: "Jersey Math reward endpoint"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/players/{id}/jersey-math body {correct,wrong}. Reward rule: if wrong>3 => flat 10 coins; else => 10*correct. correct/wrong clamped 0..10. Adds coins to player, returns {coins_awarded,correct,wrong,player}. Curl-verified: correct=7,wrong=2 -> 70 (coins 100->170); correct=5,wrong=5 -> 10."
frontend:
  - task: "Jersey Math mini-game screen"
    implemented: true
    working: "NA"
    file: "frontend/app/jersey-math.tsx, frontend/app/_layout.tsx, frontend/src/api.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New route /jersey-math. 10 equations (+/- with small numbers), each shown as 'a op b = ?' on a card. 6 Phillies-red jerseys (FanJersey) each with a candidate number (one is the correct answer, 5 unique distractors 0-25). 10-second countdown timer bar per equation (testID timer-bar); timeout counts as wrong. Tapping testID jersey-<n> picks answer: correct flashes green + ✓ count, wrong flashes red + ✗ count, then auto-advances (~650ms). After all 10, calls api.jerseyMath and shows result screen (testID jersey-math-result) with coins awarded + correct/wrong, then Continue (testID jersey-math-continue) -> /level-map. Screenshot-verified equation card, timer, and 6 numbered jerseys render."
  - task: "Trigger bonus round between levels 3 and 4"
    implemented: true
    working: "NA"
    file: "frontend/app/cooking-result.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "When a player WINS level 3 (retryLevel===3), cooking-result shows a '⚾ BONUS ROUND NEXT!' banner (testID bonus-banner) and the continue button label becomes 'Bonus Round!'; tapping it routes to /jersey-math instead of /level-map. Other levels continue straight to /level-map as before."
agent_communication:
    - agent: "main"
      message: "Iteration 14. NEW bonus mini-game 'Jersey Math' between levels 3 & 4. Test: (1) BACKEND POST /api/players/{id}/jersey-math with {correct,wrong}: wrong>3 => coins_awarded=10 (flat); wrong<=3 => coins_awarded=10*correct; player.coins increases by exactly coins_awarded; values clamp 0..10; 404 unknown player. (2) FRONTEND directly load /jersey-math: verify 10 questions total (counter 'N / 10'), each equation 'a +/- b = ?' with 6 tappable Phillies jerseys (testID jersey-<number>) one of which equals the answer; tapping the correct jersey increments ✓ and advances; tapping a wrong one increments ✗; a 10s timer (testID timer-bar) auto-advances as a wrong answer on timeout. After 10 questions the result screen (testID jersey-math-result) shows coins awarded and correct/wrong counts, and Continue (testID jersey-math-continue) goes to /level-map. You can compute expected coins from your ✓/✗ tally using the rule above. (3) TRIGGER: hard to reach via real play; verify by code/logic that winning level 3 routes cooking-result's continue to /jersey-math (bonus-banner shown). Anonymous UUID player via onboarding. NOTE for equation answers: the correct jersey number equals a+b or a-b shown on the card - read the equation card to pick."

## ---- Iteration 17: Mini 3 - Hockey Shootout (after Level 8) ----
backend:
  - task: "Hockey Shootout reward endpoint"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/players/{id}/hockey-shootout body {goals}. coins_awarded = 10*goals (no win/lose). goals clamped 0..10. Adds coins, returns {coins_awarded,goals,player}. Curl-verified: goals=6 -> 60 (coins 100->160), goals=0 -> 0. 404 unknown player."
frontend:
  - task: "Mini 3 Hockey Shootout screen"
    implemented: true
    working: "NA"
    file: "frontend/app/hockey-shootout.tsx, frontend/app/_layout.tsx, frontend/src/api.ts, frontend/app/cooking-result.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New /hockey-shootout (Mini 3). Flyers-orange theme. A net at top with a Flyers goalie (orange pads, white helmet, 'P') that slides left-right continuously. A black puck at the bottom is dragged horizontally via PanResponder; releasing launches it straight up (Animated 500ms) at the net. On arrival: blocked if |puckX-goalieX| < (GW+PW)/2 => 'SAVE!'; else 'GOAL!' (+1 goal). 10 shots (testID counter 'Shot N / 10'). Each shot has a 5s timer (testID shot-timer); on timeout the puck auto-launches from its current spot. After 10 shots finish() posts api.hockeyShootout({goals}) and shows result (testID hockey-result) with goals X/10 and coins, Continue (testID hockey-continue) -> /level-map. No win/lose. Screenshot-verified: header, net, goalie, puck, 5s timer all render."
  - task: "Trigger Mini 3 after Level 8"
    implemented: true
    working: "NA"
    file: "frontend/app/cooking-result.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "cooking-result bonusRoute: L3->/jersey-math, L6->/eagles-match, L8->/hockey-shootout (banner 'Mini 3: Hockey Shootout'), L12->/eagles-flip, else /level-map."
agent_communication:
    - agent: "main"
      message: "Iteration 17. NEW Mini 3 (Hockey Shootout) after Level 8. Test: (1) BACKEND POST /api/players/{id}/hockey-shootout {goals}: coins_awarded=10*goals, player.coins += that, goals clamp 0..10, 404 unknown. Cases {goals:6}=60,{0}=0,{10}=100,{15}=100(clamp). (2) FRONTEND load /hockey-shootout: shows 'Shot 1 / 10', a Flyers goalie that MOVES across the net, a draggable black puck at the bottom, and a 5-second per-shot timer (testID shot-timer) that counts down. DRAG the puck (it's an Animated.View with PanResponder — use mouse drag on the puck element, or drag by its position) left/right then RELEASE to launch it up at the net; a 'GOAL!' or 'SAVE!' flash appears and the goal counter (🥅 N) updates on a goal. Also verify: if you DON'T shoot within 5s the puck auto-launches (shot still counts). After 10 shots the result screen (testID hockey-result) shows 'GOALS X / 10' and coins, Continue (testID hockey-continue) -> /level-map. Because dragging an animated view in Playwright web can be tricky, it is acceptable to verify the auto-launch-on-timeout path advances shots to completion (wait through the 5s timers) and that the result screen + backend post occur; also verify at least one manual drag-release fires a shot if feasible. No win/lose. (3) TRIGGER (code-level ok): winning Level 8 routes to /hockey-shootout. Anonymous UUID player via onboarding. Do NOT retest earlier mini-games/levels."

## ---- Iteration 16: Mini 2 changed to all-showing match; new Mini 7 flip game after L12 ----
frontend:
  - task: "Mini 2 is now an all-jerseys-showing match game (NOT flip/memory)"
    implemented: true
    working: "NA"
    file: "frontend/app/eagles-match.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "BUGFIX per user: Mini 2 must NOT be a flip/memory game. Rewrote /eagles-match so all 20 jersey tiles (testID tile-0..19) are ALWAYS face-up showing name+number. Tap one tile to select (gold highlight); tap a second: same number => both matched (green, ✓, disabled) and pairs counter++; different number => misses++ (both flash red ~0.55s, busy-locked, then deselect). 45s timer, same reward endpoint. Win at 10 pairs => finish(completed=true); timeout => finish(completed=false). Screenshot-verified: 20 face-up jerseys with duplicate numbers visible."
  - task: "Mini 7 Eagles FLIP & match memory game after Level 12"
    implemented: true
    working: "NA"
    file: "frontend/app/eagles-flip.tsx, frontend/app/_layout.tsx, frontend/app/cooking-result.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New /eagles-flip (Mini 7, header 'MINI 7'): the flip/memory version (tiles start face-down 🦅, flip up to 2, match same number => stays; mismatch => misses++ and flip back after 800ms). Uses same api.eaglesMatch reward endpoint and rule. Triggered when winning Level 12 (cooking-result bonusRoute retryLevel===12 -> /eagles-flip, banner 'Mini 7: Flip & Match'). Mini 1 (L3)->/jersey-math, Mini 2 (L6)->/eagles-match, Mini 7 (L12)->/eagles-flip."
agent_communication:
    - agent: "main"
      message: "Iteration 16. Two things: (A) Mini 2 (/eagles-match) is now an ALL-JERSEYS-SHOWING match game (no flipping). Load /eagles-match: 20 tiles (testID tile-0..tile-19) all show a green Eagles jersey with name+number from the start. Tap two tiles with the SAME number -> they become matched (✓, disabled) and 'N / 10 pairs' increments; tap two with DIFFERENT numbers -> ✗ misses increments and they briefly flash red then reset. Since all numbers are visible you can deterministically pick two equal numbers. Verify: a correct match increments pairs and disables both tiles; a wrong match increments misses; 45s timer (testID timer-bar); on timeout result screen (testID eagles-match-result) shows and Continue (testID eagles-match-continue) -> /level-map. (B) NEW Mini 7 (/eagles-flip) is the FLIP/memory version, header 'MINI 7', tiles start face-down (🦅) and flip on tap; matching same number keeps them, mismatch flips back + misses++. Verify flip reveal, one match, one miss, timer, result screen (testID eagles-flip-result), Continue (testID eagles-flip-continue) -> /level-map. Both use backend POST /api/players/{id}/eagles-match already verified (completed&&misses<=3 => 100-10*misses else 5) - just confirm the finish call posts and result coins render. TRIGGER (code-level ok): L3->/jersey-math, L6->/eagles-match, L12->/eagles-flip. Anonymous UUID player via onboarding. Do NOT retest unrelated prior features."

## ---- Iteration 15: Mini 2 - Eagles jersey memory match (after Level 6) ----
backend:
  - task: "Eagles Match reward endpoint"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/players/{id}/eagles-match body {completed:bool, misses:int}. Rule: if completed AND misses<=3 => coins=100-10*misses; else (misses>3 OR not completed) => 5 (consolation). misses clamped 0..20. Adds coins, returns {coins_awarded,completed,misses,player}. Curl-verified: {true,0}->100, {true,3}->70, {true,4}->5, {false,1}->5. 404 unknown player."
frontend:
  - task: "Mini 2 Eagles memory match screen"
    implemented: true
    working: "NA"
    file: "frontend/app/eagles-match.tsx, frontend/src/components/JerseyBack.tsx, frontend/app/_layout.tsx, frontend/src/api.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New route /eagles-match. 20 face-down tiles (testID tile-<0..19>) = 10 pairs randomly drawn from a 30-player Eagles roster (number:name). Kelly-green (#128A3C) jersey BACKS (JerseyBack component) show player NAME above a big white number outlined black. 45s countdown (testID timer-bar). Tap a tile to flip; flip a second: if same number -> stays matched (pairs counter increments); else misses++ and both flip back after ~800ms (busy-locked during eval). Win when all 10 pairs matched -> finish(completed=true). Timeout -> finish(completed=false). On finish calls api.eaglesMatch and shows result screen (testID eagles-match-result) with coins + pairs/misses, Continue (testID eagles-match-continue) -> /level-map. Screenshot-verified: header 'MINI 2', 4x5 grid, flipping tile-0 revealed CARTER #98 green jersey."
  - task: "Trigger Mini 2 after Level 6"
    implemented: true
    working: "NA"
    file: "frontend/app/cooking-result.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "cooking-result bonusRoute: win && retryLevel===3 -> /jersey-math (Mini 1); win && retryLevel===6 -> /eagles-match (Mini 2); else /level-map. Banner shows bonusName ('Mini 2: Eagles Match' for level 6)."
agent_communication:
    - agent: "main"
      message: "Iteration 15. NEW Mini 2 (Eagles memory match) after Level 6. Test: (1) BACKEND POST /api/players/{id}/eagles-match {completed,misses}: completed && misses<=3 => coins=100-10*misses; else => 5; player.coins += coins_awarded; misses clamp; 404 unknown. Cases: {true,0}=100,{true,1}=90,{true,3}=70,{true,4}=5,{false,0}=5. (2) FRONTEND load /eagles-match directly: 20 tiles (testID tile-0..tile-19) start face-down (🦅), 'N / 10 pairs' counter, 45s timer (testID timer-bar). Tap tile-0 to flip and reveal a kelly-green jersey with a name+number. Matching flow: tap two tiles; matching numbers stay revealed and increment the pairs counter; non-matching increments ✗ misses and both flip back. IMPORTANT: to find a matching pair you may flip tiles one at a time to learn which number each holds (note: after a non-match they flip back). Verify that matching two tiles of the SAME number keeps them matched. You do NOT need to complete all 10 (that's slow); verify the match/miss mechanic, the counter, and that when the timer expires the result screen (testID eagles-match-result) appears and Continue (testID eagles-match-continue) -> /level-map. (3) TRIGGER (code-level ok): winning level 6 routes cooking-result continue to /eagles-match with banner 'Mini 2: Eagles Match'. Anonymous UUID player via onboarding. Prior mini-game (Jersey Math/Mini 1) and other features already passed - no retest needed."

## ---- Iteration 18: Mini 2 unmatched-pair bug fix + Mini 3 sounds ----
frontend:
  - task: "Mini 2 Eagles Match - fix leftover unmatched jerseys"
    implemented: true
    working: "NA"
    file: "frontend/app/eagles-match.tsx, frontend/app/eagles-flip.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "USER BUG: 'there were 2 jerseys that didnt match' at end of Mini 2. Root cause: matched pairs stored via setMatched([...matched, a, b]) using a STALE `matched` closure; rapid taps could drop a previously matched pair, leaving 2 tiles unmatched with no valid partner. FIX: eagles-match.tsx now uses selectedRef (prevents double-select races), functional setMatched(prev => [...prev, sel, id]), and matchedCountRef for the win check. Same functional-update fix applied to eagles-flip.tsx (Mini 7). buildTiles is verified to always produce 10 valid pairs (10 distinct roster players x2, all unique numbers). Mini 2 is the ALL-VISIBLE match game (all 20 jerseys face-up, testID tile-0..19), NOT the flip game."
agent_communication:
    - agent: "main"
      message: "Iteration 18. Test FRONTEND ONLY, Mini 2 (/eagles-match): all 20 jerseys are shown FACE-UP with visible numbers (testID tile-0..tile-19). Dismiss the 'How to Play' overlay first (testID howto-got-it). Then MATCH ALL 10 PAIRS by tapping two tiles with the SAME visible number. CRITICAL: verify that after matching all pairs there are NEVER 2 leftover jerseys that cannot be matched - every jersey must have exactly one same-number partner among the 20. Try tapping quickly to confirm no matched pair gets dropped. Pairs counter should reach 10/10 and the result screen (testID eagles-match-result) should appear with Continue (testID eagles-match-continue). Timer is now 50s. No backend changes in this iteration (eagles-match reward endpoint already passed)."
