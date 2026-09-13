# RevenueCat — integrated (2026-06)
Memory for interacting with the user's RevenueCat account via the integration proxy later.

## Identifiers (from /setup response — verbatim)
- rc_project_id: proj403b0988
- apple_app_id: appa47ca70086
- play_app_id: app81f81f49dc
- entitlement_lookup_key: pro
- offering_lookup_key: default
- bundle_id / package_name: com.emergent.dailygrowthhub.zjacc0
- Packages (package -> product_id, current price):
  - $rc_monthly -> prodbed2df6866   ($9.99 / P1M, trial: none)
  - $rc_annual  -> prode8c03d8f15   ($79.99 / P1Y, trial: none)
- Dashboard: https://app.revenuecat.com/projects/proj403b0988

SDK keys live only in frontend/.env (EXPO_PUBLIC_REVENUECAT_TEST_API_KEY / _IOS_API_KEY / _ANDROID_API_KEY). Not stored here.

## App design notes
- Single `pro` entitlement unlocks ALL features INCLUDING the private tracker.
  (The managed proxy provisions exactly one entitlement + one `default` offering, so a
  separate independent "private tracker" price is NOT supported — Premium covers everything.)
- 10-day free trial is app-level (computed from profile signupDate in src/revenuecat.tsx useAccess),
  NOT a store trial. After 10 days, `pro` entitlement required.
- Gating (client-side only, entitlement is source of truth): daily check-in flow (app/flow.tsx),
  Private tab (app/(tabs)/intimacy.tsx PremiumGate), Today trial/upgrade banner → /paywall.
- Paywall: app/paywall.tsx (monthly + yearly packages from offerings, restore purchases).

## Status check
AUTH='Authorization: Bearer <emergent key, pre-substituted>'
curl -sS -H "$AUTH" "$INTEGRATION_PROXY_URL/internal/revenuecat/projects/9aec21cd-6065-4088-b685-866de5417e6e/status"
If project_state < project_created, re-fetch the RevenueCat playbook via integration expert.

## Later product updates (integration proxy ONLY — never call RevenueCat REST API)
- Change price/duration/trial OR add a package (upsert):
  POST $INTEGRATION_PROXY_URL/internal/revenuecat/projects/9aec21cd-6065-4088-b685-866de5417e6e/products
  body: {"products":[{"package":"$rc_monthly","price":14.99,"currency":"USD","period":"P1M","trial":"P1W","prices":[{"amount_micros":14990000,"currency":"USD"}]}]}
  (amount_micros = price × 1,000,000; omit "trial" for none)
- Remove a package:
  DELETE $INTEGRATION_PROXY_URL/internal/revenuecat/projects/9aec21cd-6065-4088-b685-866de5417e6e/products/%24rc_monthly
- Recover identifiers / repopulate .env: re-run the idempotent /setup call.

## Going LIVE (USER does these — agent cannot perform/verify)
Test Store (Expo Go / web preview / dev build) needs none of this. For real store purchases:
1. Upload App Store Connect API key (.p8) + Google Play service-account JSON to the RevenueCat dashboard.
2. Set up payment profiles in App Store Connect & Play Console.
3. Create matching IAP products using the SAME product IDs shown in the RevenueCat dashboard.
4. Make a release build, test via TestFlight / Play internal testing, then submit for review.
All steps are in the FAQ section of the payments panel.
