# Aura — Daily Self-Growth Journal (PRD)

## Original Problem Statement
A mobile app to add information daily and store it for later searching. Info on pages
1,3,5,6,8,9 (and journal) is timestamped and searchable. Progress is shown on a
calendar; the app logs how many days the user logs in. Eleven "pages" make up the
daily flow, with special weekly pages (Taking Control, Weekly Goals, Weekly Reflection)
appearing on day 1 and every 7th day. Affirmations and inspirational quotes are AI-generated.

## User Choices
- No authentication for now (anonymous device userId; login to be added later).
- Affirmations (page 4) + inspirational quotes (page 7) AI-generated fresh daily; weekly content AI-generated.
- Calendar shows colored streaks; tap a day to view/edit that day's full entry.
- "Day 1" counts from signup date (special pages on days 1, 7, 14, 21...).
- Design left to us — delivered a warm "Hand-Drawn / Journal" aesthetic (sage + recycled-paper palette, Fraunces + Plus Jakarta Sans).

## Architecture
- **Frontend:** Expo Router (React Native). Bottom tabs: Today, Calendar, Search, Progress. Stack screens: Daily Flow (`/flow`), Day Detail (`/day/[date]`). react-query for data, react-native-keyboard-controller for the input-heavy flow, react-native-calendars for the month grid, @react-native-vector-icons/feather for icons.
- **Backend:** FastAPI + MongoDB (motor). Collections: `profiles`, `logins`, `entries`, `daily_content`.
- **AI:** emergentintegrations LlmChat, OpenAI gpt-5.4-mini, generates 3 affirmations + 1 quote per day, cached per (userId, date). Static fallback if AI fails.

## Core Requirements (static)
- Guided 11-page daily check-in with conditional special/weekly pages.
- Timestamped, searchable entries; calendar streak tracking; login-day counter.
- View/edit any past day.

## Implemented (2026-09-06)
- Backend: `/api/init`, `/api/day/{date}` (GET/PUT), `/api/calendar`, `/api/search`, `/api/insights`. Day-number + isSpecial logic, streak/longest-streak computation, per-day AI content caching.
- Frontend: Today dashboard (hero, AI quote, streak widget), full daily flow (all 11 pages + final affirmation, affirmation card selection, workout chips, yes/no + count chips, notes, journal, weekly reflection), Calendar with colored streaks + legend, Search (grouped results), Progress/insights (streaks, workout breakdown).
- Verified end-to-end by testing agent (14/14 backend tests, full frontend flow).

## Implemented — Iteration 2 (2026-09-06)
- **Auth (both):** email/password (bcrypt) + Emergent Google OAuth. DB-backed session tokens in `user_sessions`; `get_account_id` dependency; all data endpoints accept Bearer token (account) OR `userId` query (anonymous). Endpoints: `/api/auth/register|login|me|logout|session`.
- **Anonymous→account migration:** on first sign-in the device userId's entries/logins/daily_content/profile move into the account (`deviceUserId` in auth request).
- **Mood Check:** 5 emoji-face picker as the FIRST daily-flow step; stored per day (`entry.mood`); shown on Calendar (this-week mood strip) + Progress (mood breakdown).
- **Daily Reminder:** `expo-notifications` local daily schedule, default 9:00 AM, adjustable + toggle in new Settings screen; contextual permission handling + Open Settings fallback. (Fires only on installed build, not Expo Go/web.)
- **Weekly Recap:** shareable card screen (`react-native-view-shot` + `expo-sharing`) with streak/entries/mood row/wins/highlight quote and prev/next week navigation.
- **Tweaks:** week starts Sunday (calendar `firstDay=0`, Today streak row, recap Sun–Sat window); Workout now multi-select (`workouts` array).
- New screens: `app/auth.tsx`, `app/settings.tsx`, `app/recap.tsx`. New: `src/auth-context.tsx`, `src/notifications.ts`, `src/mood.ts`.
- Verified by testing agent (25/25 backend tests + full frontend flows). Google OAuth not auto-tested (interactive).

## Backlog / Remaining
- **P2:** Optional login gate / account settings (change password, delete account).
- **P2:** Calendar per-day mood emoji directly in the grid cells.
- **P2:** Export / rich journal (photos via Emergent Object Storage).
- Cleanup: remove legacy singular `workout` read in insights once no legacy docs remain.

## Next Tasks
- Await user feedback; prioritize auth when they're ready to sync data.
