# Thali Tracker — Complete Build Guide
### Reference document for AI-agent-assisted development

This file is the single source of truth for building this project. Give it to
your coding agent (Claude Code or similar) and build **one module at a time**,
in the order listed in Section 6. Do not let the agent jump ahead to a later
module until the current one meets its "Definition of Done."

---

## 0. Product Principles (do not violate these while building)

1. **The user customizes their own meal plan — no curated substitution system.**
   The plan generator produces a starting point based on goal and
   calorie/macro targets. Every meal is then freely editable: the user can
   remove any food item from a meal and add any other food from the full
   database in its place (e.g. swap chicken breast for eggs if that's what
   they can afford that week), using the same search used for food logging.
   The system recalculates the meal's and day's nutrition totals live and
   shows the user how the edit affects their targets — it never blocks the
   edit or forces a specific "approved" replacement.
2. **Food is cuisine-agnostic.** The food database is one universal table.
   Bengali dishes are a strength of the dataset, not a restriction on it.
   Someone eating oats and chicken breast is served exactly as well as
   someone eating bhaat and dal.
3. **The plan adapts to the user's goal.** Weight loss, maintenance, weight
   gain, and muscle gain must visibly produce different plans (different
   calorie targets, different macro ratios, different portion sizes) — never
   one fixed template with a label swapped on top.
4. **Calculate locally, sync important state in batches.** High-frequency
   actions (logging a food, editing quantity) never generate an HTTP request
   per keystroke or per +/- tap. Batch and debounce.
5. **Subscription state is server-authoritative, always.** Never trust a
   browser flag for subscription access.
6. **Utility screens are plain; brand personality lives in marketing.**
   Daily-use screens (Dashboard, Track, Plan) should read like a helpful
   notebook — clear numbers, plain labels. Cultural/brand storytelling
   belongs on the public marketing site, not on a screen the user opens six
   times a day.
7. **AI never touches the database directly.** AI output is always schema
   validated (Zod) and business-rule validated (calorie/macro sanity) before
   it can be persisted.
8. **Modular monolith first.** One API application, strong module
   boundaries, no microservices until real scale or team-ownership needs
   force it.

---

## 1. Design System (for Stitch regeneration)

Use this style guide prompt first, then the per-screen prompts. This
supersedes the earlier version — it corrects the "premium/brass" tone
mismatch, adds goal-adaptive framing, and restructures food logging and
meal planning around user-driven, search-first customization rather than
any curated substitution system.

### 1.1 Style Guide Prompt

```
Design system for a desktop-first website: a personalized diet and
macro-tracking subscription service for Bangladesh, paid via mobile carrier
billing (starting around 12 BDT/day). Users span a wide range: students on a
tight daily food budget, budget-conscious families, and anyone working
toward weight loss, weight gain, muscle gain, or maintenance. Users eat a
mix of Bengali and non-Bengali food — this is not a Bengali-food-only app.

Visual personality: warm and approachable, but PLAIN AND UTILITARIAN on
every screen used for daily tracking. This is a tool people open five times
a day, not a boutique hospitality brand — avoid ornate, expensive-feeling
language or imagery on working screens (no "brass," no gold-coin badges, no
literary flourishes in UI copy). Reserve any deeper cultural/heritage
storytelling for the public marketing homepage only.

A core interaction pattern: every meal in the plan is editable. Users can
remove any food item and search the full food database to add a
replacement — this should feel as easy and immediate as editing a to-do
list, not a locked "generated plan" they can only accept or regenerate
wholesale.

Color palette (use exactly):
- Background: #F7F3E8 (warm off-white)
- Primary: #1F4D3E (deep green) — navigation, primary buttons, active states
- Accent: #C98A2C (warm gold) — calls to action, confirmations
- Secondary: #5A3E85 (indigo) — AI suggestions, insights, tips
- Warning: #B0472F (red) — used ONLY when a target (calorie, macro, or
  BUDGET) is exceeded, never decoratively
- Surface card: #FFFDF9, border #DFD7C2
- Text: near-black #1B1B18, not pure black

Typography:
- UI and body text: a plain humanist sans-serif (e.g. similar to Inter or
  Work Sans)
- Numbers only (calories, macros, cost, weight): a slab-serif with real
  character (e.g. similar to Zilla Slab), used ONLY for numerals, not for
  every heading — keep marketing headlines in the sans-serif so utility
  screens don't feel like a menu
- No all-caps labels. No wide letter-spacing.

Signature layout motif: a circular "plate" visualization divides into
segments for protein, carbs, and fat, filling in as the day's food log
grows. Keep this motif SIMPLE — a clean ring chart, not an ornate brass-plate
illustration.

Every meal item should show a small "Edit" affordance (an icon or text
link) making it obvious the food can be swapped — never display or
calculate real currency prices anywhere in the app.

Layout: desktop-first, 1440px baseline. Public marketing site: top nav bar,
logo left, links center, "Subscribe" CTA button in gold on the right. Logged-
in app: fixed left sidebar (Dashboard, Track, Plan, Progress, Profile),
multi-column main content area.

Tone of writing: plain, direct, short sentences. "Log lunch," not "Submit
meal entry." "590 kcal left" — not decorative or literary phrasing on
utility screens.
```

### 1.2 Onboarding Flow (goal, body stats, and food preference)

```
Onboarding flow following the diet service style guide, desktop layout,
multi-step with a thin progress line at top (not numbered circles).

Step: Goal selection — "What's your main goal?" four full-width selectable
rows: Lose weight, Maintain weight, Gain weight, Build muscle. Selected
option gets a gold left-border, not a filled background (keep it plain).

Step: Body & activity — simple form fields: age, sex, height, weight,
activity level (four plain options: sedentary, lightly active, active, very
active).

Step: Food preference — "What do you usually eat?" three plain options:
Mostly Bengali home food, A mix of everything, Mostly non-Bengali/Western.
Helper text: "This just helps us suggest foods you'll actually eat — you
can fully edit any meal later, including swapping any food for anything
else in our database."

Step: Review & confirm — a plain summary card showing the calculated daily
calorie target and macro split, with an "Edit" link back to each step, plus
a short note: "You'll be able to customize every meal after this — swap out
any food for anything else." Continue button in green, full width.
```

### 1.3 Dashboard (Logged-in Home)

```
Logged-in dashboard page following the diet service style guide, desktop,
fixed left sidebar. Main area: two-column layout. Left column (60%): today's
logged meals as a plain list grouped by Breakfast/Lunch/Dinner/Snacks, each
group with its own "+ Add food" button (not one single global add button).
Right column (40%): the circular plate visualization showing macro
breakdown, with "590 kcal left" in the slab-serif numeral style below it.
A single plain insight line below in indigo, no illustration.
```

### 1.4 Track / Food Log — MyFitnessPal-style diary + search

```
Food logging page following the diet service style guide, desktop, fixed
left sidebar. Main area is a DIARY view: four sections stacked
(Breakfast, Lunch, Dinner, Snacks), each showing already-logged items as
plain rows (food name, quantity, calories, key macros) with a small remove
icon, and a "+ Add food" text button at the bottom of each section.

Clicking "+ Add food" opens a search panel (can be shown as the main content
switching, or a right-hand panel): a prominent search bar at top
("Search any food — local or not"), with tabs below it: Recent, Frequent, My
Foods, All Results. Search results list as plain rows: food name, serving
size, calories, macros, and a "+" button to add — this list must work
identically whether the food is a Bengali dish, a branded packaged product,
or a generic international food. No cuisine-based category filters gating
the results — cuisine is metadata on each food, not a wall between
datasets. This exact search panel is reused inside meal customization (see
Diet Plan prompt below) — build it once, use it in both places.

Right-hand summary panel (fixed width): running total for today — calories
and macros, small version of the plate visualization above them.
```

### 1.5 Diet Plan — goal-adaptive, with per-item meal editing

```
7-day diet plan page following the diet service style guide, desktop, fixed
left sidebar. Top of main area shows a plain summary strip: current goal
("Weight loss — 500 kcal/day deficit") and daily calorie target, plain
text, no decorative framing.

Below, the week as seven columns, each day listing meals vertically. Each
meal shows its individual food items as a small list (not just a meal
name) — e.g. under "Lunch": Rice, Chicken breast curry, Mixed vegetables —
each item with a small "×" remove icon on hover, and an "+ Add item" link
at the bottom of each meal's item list. Removing an item or clicking
"+ Add item" opens the same search panel used in food logging (see Track
prompt), letting the user add any food from the full database. As items
are added or removed, the meal's calorie/macro subtotal updates live next
to the meal name. If the edited meal now differs meaningfully from its
original target, show a small plain note under it (e.g. "320 kcal below
target for this meal" or "12g under your protein target today") — informal
and informational, never a blocking warning or red error state, since the
user is deliberately in control here.

A day's daily total updates live at the bottom of that day's column as
items change. No "Swap" link needed separately — editing individual items
directly is the primary interaction.
```

### 1.6 Progress, Account/Subscription

```
Keep the existing Progress and Account/Subscription layouts (two-panel
progress charts, centered single-column account settings), but strip any
brass/ornate literary copy — replace with plain equivalents (e.g. "Weekly
consistency" instead of "7-Day Thali Discipline," "Daily targets" instead of
"Kã̃shā Thali Targets"). Keep the plate-icon weekly adherence row and the
carrier billing card exactly as structured, just in plain language.
```

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Web | Next.js + React + TypeScript | Static export for marketing pages if hosting is static-only; SSR/full server if a Node host is available |
| UI | Tailwind CSS | Use design tokens from Section 1 as CSS variables, not hardcoded hex scattered in components |
| Client state | Zustand | Keep separate from server-state cache |
| Server state | TanStack Query | Handles caching/retries for API calls |
| Local DB | IndexedDB via Dexie | Offline-first: foods cache, food logs, sync queue |
| PWA | Web App Manifest + Service Worker | Installable, offline tracking |
| Backend | Node.js + TypeScript + Fastify | Modular monolith, one module per domain concern |
| DB | PostgreSQL | Already confirmed available on hosting |
| ORM | Drizzle | Type-safe queries, explicit migrations |
| Validation | Zod | Shared schemas between client and server |
| AI | Provider-abstracted (Gemini initially) | Never called for arithmetic — only for suggestions/explanations |
| Payments | Bdapps API | Subscription authority — server-side only |
| Testing | Vitest + Playwright | Unit/domain tests + E2E |

---

## 3. Monorepo Folder Structure

```
diet-service/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   ├── onboarding/
│   │   │   ├── dashboard/
│   │   │   ├── tracker/
│   │   │   ├── plan/
│   │   │   ├── progress/
│   │   │   └── settings/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── onboarding/
│   │   │   ├── nutrition/
│   │   │   ├── food-search/
│   │   │   ├── food-log/
│   │   │   ├── meal-editing/        # NEW — remove/add food items on any meal, live recalculation
│   │   │   ├── meal-plan/
│   │   │   ├── progress/
│   │   │   └── subscription/
│   │   ├── lib/
│   │   │   ├── db/                  # Dexie schema + repositories
│   │   │   ├── sync/
│   │   │   ├── api/
│   │   │   └── pwa/
│   │   └── public/
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── subscriber/
│       │   │   ├── subscription/
│       │   │   ├── profile/
│       │   │   ├── nutrition/       # BMR/TDEE/macro calc, deterministic
│       │   │   ├── food/            # universal food catalog + pricing
│       │   │   ├── diet-plan/       # goal-based generation + user meal customization
│       │   │   ├── food-log/
│       │   │   ├── progress/
│       │   │   ├── sync/
│       │   │   ├── ai/
│       │   │   └── webhook/
│       │   └── infrastructure/
│       │       ├── db/
│       │       ├── bdapps/
│       │       ├── ai/
│       │       └── observability/
├── packages/
│   ├── domain/                      # pure business rules, no framework deps
│   ├── nutrition-engine/            # BMR/TDEE/macros — deterministic, unit-tested
│   ├── schemas/                     # shared Zod schemas
│   ├── food-data/                   # normalized static food dataset (nutrition only)
│   └── types/
├── database/
│   ├── migrations/
│   └── seed/
├── scripts/
│   ├── import-food-data/
│   └── validate-food-data/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
```

---

## 4. Corrected Data Model

No price fields, no equivalence groups, no admin-managed tier system. Instead: the plan is generated once as a starting point, then
users edit it directly — remove/add any food item on any meal, from the
full, cuisine-agnostic food database. The model just needs to track that a
meal has been customized so regenerating future weeks doesn't clobber a
user's edits.

```
foods
- id UUID PK
- canonicalName
- localNames[]              -- e.g. Bengali names, kept as metadata not a filter
- aliases[]
- cuisineTags[]             -- e.g. ["bengali"], ["western"], ["generic"] — metadata only
- category                  -- grain, protein, vegetable, packaged, etc.
- caloriesPer100g
- proteinPer100g
- carbsPer100g
- fatPer100g
- fiberPer100g
- commonServings[]          -- { label, grams }
- source
- sourceVersion
- verifiedAt

profiles
- subscriber_id PK/FK
- age, sex, height_cm, weight_kg, activity_level, goal, target_weight_kg
- dietary_preferences JSONB
- cuisine_preference        -- "bengali" | "mixed" | "western" — biases AI suggestions only, never restricts search
- updated_at

diet_plans
- id UUID PK
- subscriber_id FK
- version
- calorie_target
- protein_target_g / carbs_target_g / fat_target_g
- plan_json JSONB
  -- structure per day: { day, meals: [
  --   { mealSlot, items: [{ foodId, quantity, unit }], isCustomized: bool }
  -- ]}
- created_at

food_logs
- id UUID PK
- subscriber_id FK
- logged_on (date)
- meal_slot                 -- breakfast | lunch | dinner | snack
- food_id FK
- quantity, unit
- calculated_nutrition JSONB
- created_at / updated_at
```

---

## 5. Core Logic Modules — What Each One Must Do

### 5.1 `nutrition-engine` (deterministic, no AI, no network)
- `calculateBMR(profile)` → Mifflin-St Jeor or similar, documented formula.
- `calculateTDEE(bmr, activityLevel)`.
- `calculateCalorieTarget(tdee, goal)` — must branch by goal:
  - lose_weight → TDEE − configurable deficit (validate against a safe floor, never below ~1200 kcal without a flag)
  - maintain → TDEE
  - gain_weight → TDEE + surplus
  - build_muscle → TDEE + smaller surplus, protein target raised
- `calculateMacroTargets(calorieTarget, goal, weight_kg)` — protein target scales with goal and bodyweight, not a flat percentage for every goal.
- **What to avoid:** never call an LLM here. Never let the AI module override these numbers — AI can suggest foods that *fit* the numbers, never recompute the numbers itself.

### 5.2 Meal customization logic (lives inside the `diet-plan` API module — no separate package needed)
- `addItemToMeal(planId, day, mealSlot, foodId, quantity)` → appends the item,
  marks that meal `isCustomized: true`, recalculates the meal's nutrition
  subtotal via `nutrition-engine`'s scaling formula (nutrient = per100g ×
  quantity / 100).
- `removeItemFromMeal(planId, day, mealSlot, foodId)` → removes the item,
  marks the meal customized, recalculates.
- `getMealDeviation(meal, mealTarget)` → returns a plain informational diff
  (e.g. "-320 kcal vs target," "-12g protein vs target") for display — never
  blocks the edit, purely informational.
- **What to avoid:** don't auto-regenerate a customized meal on the next
  plan refresh — once `isCustomized` is true for a meal, leave it alone
  until the user explicitly asks to reset or regenerate that specific meal.
  Don't build any admin-curated substitution/equivalence system — the
  user's own choice from the full food database is the entire mechanism.

### 5.3 `food` module (API)
- Search endpoint must query across the **entire** food table — no cuisine-based table splitting. `cuisineTags` and `cuisine_preference` are used only to **rank** results, never to **filter** them out.
- Local/common-food search should stay client-side first (per the original plan's "static data → client" principle) with a server fallback for less common items and branded products.

### 5.4 `diet-plan` module (API + AI-assisted)
Generation flow per meal slot (this only runs to produce the *initial*
starting plan — after that, meals are user-edited per 5.2, not
regenerated):
1. Get calorie/macro sub-targets for that slot (derived from daily targets).
2. Ask the AI provider for candidate foods that fit the calorie/macro
   target for that slot, biased (not restricted) by `cuisine_preference`.
3. Validate the AI's structured output with Zod, then re-validate the
   numbers yourself with `nutrition-engine` — do not trust the AI's own
   arithmetic.
4. Persist as the starting `plan_json`, every meal marked
   `isCustomized: false`.
5. From here, all further changes go through the meal customization logic
   in 5.2, driven entirely by the user — the AI is not involved in edits.
- **What to avoid:** don't let the AI write directly into `diet_plans` — the API module persists only after validation passes. Don't gate any food out of the customization search based on cost, cuisine, or any curated list — the full database is always available for the user's own edits.

### 5.5 `sync` module
- Stable client-generated event IDs, idempotent server processing (per original plan, unchanged).
- Batch food-log writes; never fire a request per quantity keystroke.

### 5.6 `subscription` / `webhook` modules
- Unchanged from the original plan — Bdapps is external, browser subscription flags are never trusted, webhook processing is idempotent.

---

## 6. Build Order (follow this sequence with the AI agent)

Work through phases in order. Each phase has a **Definition of Done** — do
not start the next phase until the current one's DoD is met and tested.

### Phase 0 — Foundation
- Monorepo scaffold matching Section 3, TypeScript config, linting, CI.
- **DoD:** `pnpm build` runs clean across all packages with placeholder code.

### Phase 1 — Nutrition Engine (pure logic, no UI, no API yet)
- Implement `nutrition-engine` package exactly per 5.1.
- Unit tests covering all four goals and edge cases (very low/high activity, extreme weights).
- **DoD:** 100% of documented functions have unit tests; a reviewer can read the tests and understand the formulas without reading the implementation.

### Phase 2 — Food Data
- Build `food-data` package: normalized dataset with nutrition fields per Section 4, spanning Bengali, Western, and generic/branded foods in one table.
- Import script + validation script (flag any food missing required nutrition fields).
- **DoD:** dataset validated, no cuisine-based data silos — one table/collection, searchable and swappable for anything else in it.

### Phase 3 — API Skeleton + Profile/Onboarding
- `subscriber`, `profile` modules. Profile schema includes the `cuisine_preference` field.
- **DoD:** can create a subscriber, save a profile, and retrieve calculated calorie/macro targets via API.

### Phase 4 — Food Search + Logging (MyFitnessPal-style)
- `food` module search endpoint (cuisine-agnostic ranking, not filtering).
- `food-log` module: log/edit/delete entries by meal slot, cost calculated per entry.
- **DoD:** can search across mixed cuisine foods in one query and log a full day across all four meal slots with nutrition totals matching manual calculation.

### Phase 5 — Local-First Web MVP
- IndexedDB (Dexie) schema, offline food logging, sync queue.
- Dashboard, Track (diary + search), Onboarding screens built from Section 1 prompts.
- **DoD:** app usable fully offline for logging; syncs cleanly when back online; UI matches the plain, utilitarian tone specified in Section 1.

### Phase 6 — Diet Plan Generation + Meal Customization
- `diet-plan` module per 5.4 (initial AI-assisted generation) plus the meal customization logic per 5.2 (add/remove item, live recalculation, deviation notes).
- Plan screen from Section 1.5 (per-item editing within each meal, live subtotal updates).
- **DoD:** generating a starting plan for each of the four goals produces visibly different calorie/macro targets and portions. Separately, a user can open any meal, remove an item, search the full database, add a replacement, and see the meal/day totals update correctly — verified for at least one case where the user swaps an expensive protein (e.g. chicken breast) for a cheaper one (e.g. egg or soya chunks) they typed into search themselves.

### Phase 7 — Subscription (Bdapps)
- Adapter, webhook handling, subscription middleware — unchanged from original plan.
- **DoD:** subscription state changes only via verified webhook; browser can never self-report as subscribed.

### Phase 8 — Progress + Admin
- Progress screen, weight logs, admin food catalog management (adding new foods, correcting nutrition data, verifying entries) — no pricing or tier curation needed since users self-serve substitutions.
- **DoD:** admin can add a new food to the catalog and it's immediately searchable/usable in meal customization.

### Phase 9 — Production Hardening
- Security review, rate limits, backups, E2E tests covering: subscribe → onboarding → plan generation → log food → sync → progress.
- **DoD:** full E2E flow passes for all four goals, including the plan-customization path: subscribe → onboarding → generated plan → user removes and replaces a meal item → totals recalculate correctly → syncs → visible in progress.

---

## 7. Best Practices

- Domain logic (`packages/domain`, `nutrition-engine`) must have zero React or Fastify imports — pure TypeScript, testable in isolation.
- Every API input validated with a shared Zod schema, reused on the client for form validation — one schema, not two copies.
- Every write to `sync_events` / `webhook_events` tables must be idempotent by unique key, per the original plan.
- Reuse one shared food-search component/endpoint across food logging and meal customization — they're the same interaction, don't build it twice.
- Write tests for the meal-customization deviation math explicitly (5.2) — it's user-facing on every edit and easy to get subtly wrong with unit conversions.

## 8. What to Avoid

- Do not let a single "reference" plan template exist in code with goal as a cosmetic label on top — every goal must produce a genuinely different calculation (calorie target, macro split, portions).
- Do not split the food database by cuisine into separate tables or separate search endpoints — one universal source, ranked not filtered.
- Do not call an LLM for arithmetic (calories, macros) — LLM output is always numbers-checked by the deterministic engines before being trusted.
- Do not track or display real currency prices anywhere — they go stale immediately and create a false sense of precision; free-form user editing against the full food database is the honest mechanism here.
- Do not auto-modify a user's meal without an explicit action from them — every add/remove is a direct user choice, never an automatic substitution.
- Do not build microservices for this stage — one modular monolith per Section 0, principle 8.
- Do not let AI write directly to the database.
- Do not carry "premium/ornate" visual language onto daily-use screens — reserve it for marketing only, per Section 0, principle 6.

## 9. Managing the AI Agent Through This Build

- Feed the agent **one phase at a time** from Section 6, pasting the relevant module logic (Section 5) and folder structure (Section 3) alongside it — don't ask it to build the whole system in one pass.
- After each phase, ask the agent to list what it built against that phase's Definition of Done explicitly, before moving on.
- When asking for the diet-plan generation logic (Phase 6), explicitly remind the agent that the AI only produces a *starting* plan — all further editing must go through the user-driven meal customization logic (5.2), never through the AI regenerating or "optimizing" a meal on its own.
- Re-paste Section 0 (Product Principles) at the start of any new agent session/context reset — it's short by design so it survives context limits.
