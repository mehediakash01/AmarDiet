# AmarDiet — Design System Reference

> Single source of truth for design tokens, components, and UX patterns.
> All tokens are defined as CSS custom properties in `apps/web/app/globals.css`
> and extended into the Tailwind theme in `apps/web/tailwind.config.ts`.

---

## 1. Color Tokens

All colors are defined as CSS custom properties using RGB channel values so that Tailwind's opacity modifier (`/50`, `/20`, etc.) works correctly.

| Token | CSS Variable | Hex | Usage |
|-------|-------------|-----|-------|
| Background | `--background` | `#09090b` (zinc-950) | Page canvas |
| Surface | `--surface` | `#18181b` (zinc-900) | Cards, panels |
| Surface Elevated | `--surface-elevated` | `#27272a` (zinc-800) | Inputs, dropdowns |
| Border | `--border` | `#27272a` (zinc-800) | Dividers, card borders |
| Text Primary | `--text-primary` | `#f4f4f5` (zinc-100) | Headings, key data |
| Text Secondary | `--text-secondary` | `#a1a1aa` (zinc-400) | Labels, subtext |
| Text Muted | `--text-muted` | `#71717a` (zinc-500) | Placeholder, hint text |
| Calories | `--macro-calories` | `#22d3ee` (cyan-400) | Calorie ring, calorie readouts |
| Protein | `--macro-protein` | `#c084fc` (purple-400) | Protein bars and values |
| Carbs | `--macro-carbs` | `#34d399` (emerald-400) | Carbs bars and values |
| Fat | `--macro-fat` | `#fbbf24` (amber-400) | Fat bars and values |
| Warning | `--warning` | `#f87171` (red-400) | **Exceedance only** — never decorative |
| Warning Surface | `--warning-surface` | `#7f1d1d` (red-900) | Exceeded calorie background |
| Primary | `--primary` | `#22d3ee` (cyan-400) | Interactive: buttons, links, focus rings |
| Primary Hover | `--primary-hover` | `#06b6d4` (cyan-500) | Hover state |
| Primary Subtle | `--primary-subtle` | `#083344` (cyan-950) | Active/selected background |

> **Rule**: Never hard-code hex values in component files. Always use the CSS variable via Tailwind class.
> **Warning** color is **reserved exclusively for when a target is exceeded**. Never use it decoratively.

---

## 2. Typography

```css
/* Base font stack (set in globals.css) */
font-family: 'Inter', 'Noto Sans Bengali', system-ui, -apple-system, sans-serif;
```

| Use | Class | Notes |
|-----|-------|-------|
| All nutrition numerals | `.font-tabular` | `font-variant-numeric: tabular-nums` |
| Bengali text | `[lang='bn']`, `.font-bengali` | `line-height: 1.6` to prevent diacritic clipping |
| Headings | `font-bold`, `font-extrabold` | Inter weights |
| Body | `font-medium`, `font-normal` | 14-16px |

---

## 3. Spacing & Radius Scale

- **Card padding**: `p-4 sm:p-5` (16-20px)
- **Gap between sections**: `space-y-6` (24px)
- **Card radius**: `rounded-2xl` (16px) for primary cards, `rounded-xl` (12px) for inner elements
- **Pill badges**: `rounded-full`

---

## 4. Motion Scale

```css
transition-all duration-200 ease-out   /* interactive states */
transition-all duration-300 ease-out   /* modal entrance */
transition-all duration-700 ease-out   /* ring chart fill */
```

All motion respects `prefers-reduced-motion` via globals.css.

---

## 5. Component Library (`apps/web/components/ui/`)

| Component | File | Purpose |
|-----------|------|---------|
| `Card` | `Card.tsx` | Surface container with optional `glass` variant |
| `Button` | `Button.tsx` | Primary / secondary / ghost / danger, size sm/md/lg |
| `Input` | `Input.tsx` | Text, number, password inputs with error state |
| `ProgressBar` | `ProgressBar.tsx` | Macro progress bars (calories/protein/carbs/fat/warning) |
| `MacroBadge` | `MacroBadge.tsx` | Color-coded inline macro pill |
| `StatTile` | `StatTile.tsx` | Large-numeral stat with label and optional trend |
| `ModalSheet` | `ModalSheet.tsx` | Bottom-sheet on mobile, centred dialog on desktop |
| `Skeleton` | `Skeleton.tsx` | Loading placeholder with pulse animation |
| `EmptyState` | `EmptyState.tsx` | Illustration-free empty state with icon, heading, CTA |
| `Toast` | `Toast.tsx` | Ephemeral feedback toasts (success, info, error) |

### Accessibility rules

- All interactive elements: `min-h-[44px]` (44px touch target)
- Focus rings: `focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none`
- Color never used as the only differentiator — always paired with label or icon

---

## 6. Key Feature Components

### `PlateRingChart` (`components/PlateRingChart.tsx`)

- SVG circular ring showing calorie consumption vs target
- Glow via `drop-shadow` — cyan when under target, red when over
- Center: remaining kcal (large numeral) or `+N kcal exceeded`
- Below: segmented Protein / Carbs / Fat tiles with `ProgressBar` per macro

### `BmiSpectrumChart` (`components/BmiSpectrumChart.tsx`)

- Multi-segment gradient bar: Underweight (indigo) to Normal (emerald) to Overweight (amber) to Obese (rose)
- Pointer badge at user's BMI percentage position
- Takeaway statement: kg delta to optimal 18.5-24.9 range

### `MealSlotCard` (`components/MealSlotCard.tsx`)

- Swipe-to-delete on mobile (touch event handler, translateX reveal)
- Desktop trash button visible on hover
- Quick-add +50g / +100g pills per food item
- Live slot subtotals (calories, P/C/F) in header

### `FoodSearchModal` (`features/food-search/FoodSearchModal.tsx`)

- Debounced search (280ms) — never fires per keystroke
- Bengali phonetic matching (e.g. "bhaat" matches vaat/rice entries)
- **Recent** tab: last 20 distinct foods from Dexie foodLogs, ordered by recency
- **Results** tab: scored ranking across canonical name, local names, aliases, cuisine tags
- Cuisine preference ranks, never filters — full database always accessible
- Keyboard navigation: up/down arrows move focus, Enter selects, Escape closes
- Empty states: distinct messages for "no recents yet" vs "no search results"
- "Add custom food" affordance in empty results state

---

## 7. Layout Conventions

| Context | Layout |
|---------|--------|
| App shell | Fixed left sidebar on desktop, bottom tab bar on mobile |
| Dashboard | `lg:grid-cols-12` — meal logs 7 cols, ring chart + stats 5 cols |
| Ring chart first on mobile | `order-1 lg:order-2` — energy summary is hero on small screens |
| All app screens | `pb-24 md:pb-8` on main to clear mobile bottom bar |
| Onboarding | Single centered column, max-w-lg, progress line at top |
| Admin | Hidden from all navigation unless `isAdmin === true`; server-guarded with `x-admin-key` |

---

## 8. Navigation

### Mobile (< md breakpoint)

- Fixed bottom tab bar: Home, Diary, [+ Scan], Plan, Progress
- Scan button elevated with bg-cyan-500 circle, 56px diameter
- Minimum 48px touch targets on all tabs

### Desktop (>= md breakpoint)

- Slim glassy top bar: brand icon (left), route links (centre), profile + scan (right)
- Active route: `bg-zinc-800/80 text-zinc-100` highlight

---

## 9. Data & State Conventions

- **No hard-coded nutrition math** in components. All BMR/TDEE/macro calculations live in `packages/nutrition-engine`.
- **No AI for arithmetic** — AI output is always re-validated by `nutrition-engine` before display.
- **Offline-first**: every user action writes to IndexedDB (Dexie) first, then queues a sync event.
- **Tabular numerals** on all macro/calorie figures via `.font-tabular`.
- **Warning red** appears only when `consumed > target` — never decorative.

---

## 10. Adding New Screens

1. Define route page in `apps/web/app/(app)/<route>/page.tsx`.
2. Use `Card` component for all surface containers.
3. Use CSS variables via Tailwind classes — never hard-code hex in JSX.
4. Bind all interactive handlers to live state — no empty onClick stubs.
5. Implement empty state with `EmptyState` component.
6. Add a Skeleton loading variant for async data.
7. Add the route to `Navbar.tsx` if it needs navigation.
8. Run `pnpm typecheck && pnpm test` before committing.
