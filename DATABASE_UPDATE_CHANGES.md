# Database Connection — What Changed

This covers ONLY the "real database connection" feature. Nothing else
(diet-plan/AI logic, subscription/Bdapps, onboarding-to-API wiring) was
touched — those are separate features to tackle next, one at a time.

## New files

- `database/migrations/0001_init.sql` — creates the 5 originally-defined
  tables (subscribers, profiles, food_logs, diet_plans, weight_logs)
- `database/migrations/0002_foods.sql` — creates the `foods` table, which
  **did not exist before** even though a food catalog was implied
- `apps/api/src/scripts/migrate.ts` — migration runner. Applies `.sql`
  files in order, tracks progress in a `schema_migrations` table, safe to
  re-run anytime
- `apps/api/src/scripts/seed-food-data.ts` — loads the static food dataset
  into the real `foods` table (idempotent upsert)
- `apps/api/src/modules/food/food.repository.ts` — new repository layer
  for food data (`DrizzleFoodRepository` + `InMemoryFoodRepository`).
  Food data previously had no repository at all — just a bare in-memory
  `Map` with no persistence path whatsoever.
- `apps/api/.env.example` — documents `DATABASE_URL` (Neon connection
  string format), `PORT`, `HOST`

## Modified files

- `apps/api/src/infrastructure/db/schema.ts` — added the `foods` table
  definition
- `apps/api/src/modules/food/food.service.ts` — rewritten to persist
  through `IFoodRepository` instead of an isolated `Map`. `addCustomFood`
  and `updateCustomFood` are now `async` (they write through to the DB)
- `apps/api/src/modules/admin/admin.routes.ts` — added `await` for the
  now-async food service calls
- `apps/api/src/app.ts` — this is the important one:
  - Wires `DrizzleFoodRepository` / `InMemoryFoodRepository` alongside the
    other repos
  - **The in-memory fallback now prints a loud warning** every time it's
    used, instead of silently happening
  - `/health` now reports the real persistence mode:
    `"database": "connected"` vs `"database": "in-memory (not persistent)"`
    — you can check this from outside the server at any time, in any
    environment, without reading logs
- `apps/api/src/index.ts` — loads `.env` via `dotenv/config` for local dev
- `apps/api/package.json` — added `dotenv` dependency, `db:migrate` and
  `db:seed` scripts
- `package.json` (root) — added `db:migrate`, `db:seed`, `db:setup`
  convenience scripts
- Three integration test files updated to construct `FoodService` with
  the new repository-based constructor signature

## How to apply

Since this is a partial update to an existing project, review these
changes against your own repo (diff, or apply as a patch) rather than
blindly overwriting — you may have made other changes since the last
export. The affected files are small and clearly scoped, so a manual
merge should be quick.

## How to verify it's actually working (don't just trust this doc)

**1. Get a connection string from Neon:**
Neon dashboard → your project → Connection Details → copy the connection
string (either the pooled one with `-pooler` in the hostname, or the
direct/unpooled one — both work with this project's plain `postgres`
driver). Paste it into `apps/api/.env` as `DATABASE_URL`.

Tip: Neon supports branching — consider creating a separate branch (or
project) for local development so you're never testing against the same
data as production.

```bash
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env and paste your real Neon connection string
pnpm install
pnpm db:setup        # runs migrations, then seeds food data
pnpm dev
```

**2. Check `/health` — this is the tell:**
```bash
curl http://localhost:3001/health
```
- `"database": "connected"` → real Postgres, data survives restarts
- `"database": "in-memory (not persistent)"` → check your `DATABASE_URL`,
  something's not wired up. You'll also see a loud warning in the server
  logs the moment it starts.

**3. Prove persistence for yourself:**
```bash
# create a subscriber
curl -X POST http://localhost:3001/api/subscribers \
  -H "Content-Type: application/json" \
  -d '{"id":"<a-uuid-here>","phone":"+8801700000000"}'

# stop the server (Ctrl+C), start it again (pnpm dev), then:
curl http://localhost:3001/api/subscribers/<the-uuid-you-used>
```
If it's still there after a full restart, it's real.

**4. For your Exonhost deployment**, the app runs on Exonhost but the
database is Neon (that's fine — they're independent, the app just connects
to Neon over the network). Set `DATABASE_URL` in your Exonhost Node.js app's
environment variables to the same (or a separate production-branch) Neon
connection string, then run:
```bash
pnpm db:migrate
pnpm db:seed
```

## What this does NOT fix yet (by design — one feature at a time)

- Onboarding still writes only to local IndexedDB, not the real
  subscriber/profile API — that's the next feature to tackle
- Diet plan generation is still the same rule-based picker (no AI) — real
  scope of that decision is a separate conversation
- Subscription/Bdapps still doesn't exist
- The frontend's diet-plan fetch calls still use a hardcoded
  `localhost:3001` URL and fall back to a static mock plan if the request
  fails — needs an env-based API URL and the mock fallback needs to be
  removed once the real flow is wired end to end

## What was actually verified in this build (not just written and hoped)

- Full workspace build (`pnpm --recursive --sort run build`) — clean, 0 errors
- Full test suite (`pnpm test`) — 79/79 tests passing (50 nutrition-engine
  unit tests + 29 API integration tests)
- Real Postgres 16 instance stood up locally (for testing purposes only —
  same standard Postgres wire protocol Neon uses), migrations applied
  against it end-to-end, confirmed idempotent on re-run. This validates the
  SQL and migration logic itself; it wasn't run against your actual Neon
  instance since I don't have those credentials — do the same `/health`
  and persistence check yourself once you've plugged in your real
  `DATABASE_URL`, just to be sure nothing Neon-specific (SSL mode, pooling)
  trips it up.
- Food data seeded into the real `foods` table (42 rows), confirmed via
  direct SQL query
- Live server started against the real database, `/health` confirmed
  `"connected"`, `/api/foods/search` confirmed serving real DB-backed data
- A subscriber created through the live HTTP API was verified sitting in
  the Postgres `subscribers` table via an independent `psql` query — proof
  this is real persistence, not an in-process illusion
