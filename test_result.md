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
