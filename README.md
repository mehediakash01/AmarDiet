# 🥗 AmarDiet (Thali Tracker)
### *Personalized Nutrition, Diet Planning & Macro Tracking — Built for Real Kitchens*

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Backend-Fastify%20TypeScript-000000?style=for-the-badge&logo=fastify)](https://www.fastify.io/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%20Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![IndexedDB](https://img.shields.io/badge/Storage-Offline--First%20Dexie.js-orange?style=for-the-badge)](https://dexie.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Drizzle-336791?style=for-the-badge&logo=postgresql)](https://orm.drizzle.team/)

---

## 📖 Table of Contents
- [🌟 What is AmarDiet?](#-what-is-amardiet)
- [🎯 Who Actually Needs This?](#-who-actually-needs-this)
- [💎 Why People Should Use It (The AmarDiet Advantage)](#-why-people-should-use-it)
- [⚡ Complete Feature Walkthrough](#-complete-feature-walkthrough)
  - [1. Deterministic Scientific Onboarding](#1-deterministic-scientific-onboarding)
  - [2. Visual BMI Spectrum Analysis](#2-visual-bmi-spectrum-analysis)
  - [3. Interactive Daily Dashboard & Plate Macro Ring](#3-interactive-daily-dashboard--plate-macro-ring)
  - [4. AI Vision Meal Scanner](#4-ai-vision-meal-scanner)
  - [5. Fully Customizable 7-Day Adaptive Meal Plan](#5-fully-customizable-7-day-adaptive-meal-plan)
  - [6. Universal Bi-Lingual Food Catalog](#6-universal-bi-lingual-food-catalog)
  - [7. Interactive Weight & Adherence Analytics](#7-interactive-weight--adherence-analytics)
  - [8. Home Workouts & Evidence-Based Nutrition Principles](#8-home-workouts--evidence-based-nutrition-principles)
  - [9. Offline-First Resilience](#9-offline-first-resilience)
- [📊 Comparison: AmarDiet vs. Conventional Apps](#-comparison-amardiet-vs-conventional-apps)
- [🏗️ Technical Architecture](#️-technical-architecture)
- [🚀 Quickstart & Local Setup](#-quickstart--local-setup)
- [🎨 Design System & Colors](#-design-system--colors)

---

## 🌟 What is AmarDiet?

**AmarDiet (Thali Tracker)** is a modern, responsive, local-first web application designed to make sustainable health, weight management, and macro tracking accessible, affordable, and practical for real-world eating habits.

Most global fitness applications assume users eat avocado toast, grilled salmon, protein powder shakes, and kale salads. For millions of people across South Asia and budget-conscious households worldwide, **that is not reality**. People eat rice (*bhaat*), lentils (*dal*), fish curry (*macher jhol*), egg bhaji, and vegetables, alongside modern fitness staples like oats, chicken, and yogurt.

> [!IMPORTANT]
> **Core Philosophy**: **You don't have to change your entire food culture to be fit.**
> AmarDiet builds intelligent nutrition plans around what you actually eat and what fits your budget, calculating exact calories and macronutrients with zero guesswork.

```mermaid
flowchart LR
    A[Enter Body Metrics & Goal] --> B[Deterministic Mifflin-St Jeor Math]
    B --> C[Visual BMI & Target Breakdown]
    C --> D[Adaptive 7-Day Meal Plan]
    D --> E[Log Meals: Search or AI Photo Scan]
    E --> F[Live Plate Ring & Macro Tracking]
    F --> G[Weight Trends & Adherence Analytics]
```

---

## 🎯 Who Actually Needs This?

AmarDiet was engineered specifically for real life scenarios where generic Western fitness apps fail:

| Persona | Real-World Challenge | How AmarDiet Solves It |
| :--- | :--- | :--- |
| 🎓 **Students & Young Professionals** | Limited budget; cannot afford expensive gym diet plans, exotic grocery items, or costly imported supplements. | Optimizes daily protein from affordable local staples (eggs, lentils, soy, local fish) and allows 1-click meal item replacements. |
| 🏠 **Home Cooks & Families** | Cooking one meal for the entire family; cannot prepare a separate "diet meal" every day. | Tracks standard home-cooked dishes (*dal, bhaat, sobji, mach*) with accurate local portion measures (katori, cups, grams). |
| 🏋️ **Gym Goers & Athletes** | Need precision macro targets (protein timing, clean caloric surplus, pre-workout fuel) to build lean muscle. | High-precision macro distribution engine (up to 2.4g/kg protein) with exact gram calculations and live progress rings. |
| 📉 **Weight Loss & Health Seekers** | Frustrated by extreme crash diets and confusing nutrition myths; prone to regaining weight. | Calculates safe, sustainable caloric deficits (300–500 kcal/day) backed by the clinical Mifflin-St Jeor formula with safety floors. |
| 📶 **Mobile Users on Spotty Networks** | Commuting or in areas with intermittent internet; cannot wait for slow, heavy cloud apps to load. | **100% offline-first**: Dexie IndexedDB cache lets you log instantly; syncs seamlessly in the background when connected. |

---

## 💎 Why People Should Use It

### 1. Zero "AI Arithmetic Hallucinations"
Generic AI apps frequently make up nutritional numbers. AmarDiet uses **deterministic clinical math** ([Mifflin-St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/)) inside `@thali/nutrition-engine`. Every calorie, gram of protein, carb, and fat is calculated with exact mathematical formulas.

### 2. Complete Freedom — No Locked Meal Templates
Unlike rigid diet apps that force you into a static "7-Day Diet" you can't alter, **every single meal in AmarDiet is 100% customizable**:
- Don't have chicken breast today? Swap it for 3 boiled eggs with a single tap.
- Having lunch out? Remove the planned dish and add whatever you ate.
- The app immediately recalculates your daily subtotals in real-time.

### 3. Dual-Language & Local Food Native
Search dishes in English, Bengali script (*ভাত*, *ডাল*, *ইলিশ*), or phonetic transliterations (*bhaat*, *macher jhol*, *khichuri*). Both Bengali home-cooked dishes and Western gym staples coexist in a unified universal catalog.

### 4. Works Seamlessly Offline
Built with **IndexedDB (Dexie.js)** and an idempotent sync queue. If your data drops, logging never stutters or crashes.

---

## ⚡ Complete Feature Walkthrough

### 1. Deterministic Scientific Onboarding
A guided 4-step intake flow to establish your clinical baseline:
- **Primary Goal Selection**: *Lose Weight* (safe 500 kcal deficit), *Maintain*, *Gain Weight* (+300 kcal clean surplus), or *Build Muscle* (high-protein surplus).
- **Anthropometric Metrics**: Sex, Age, Height (cm), Current Weight (kg), Target Weight (kg), and Activity Multiplier (Sedentary to Very Active).
- **Cuisine Preference**: Biases search rankings toward *Bengali Home Food*, *Mixed/Flexible*, or *Western Staples* without ever excluding dishes.
- **Mifflin-St Jeor Target Engine**: Instantly generates your BMR (Basal Metabolic Rate), TDEE (Total Daily Energy Expenditure), and daily macro breakdown (Protein, Carbs, Fats).

---

### 2. Visual BMI Spectrum Analysis
Embedded directly in onboarding and profile reviews:
- **Interactive Color-Coded Gauge**:
  - 🔵 **Underweight** ($< 18.5$)
  - 🟢 **Normal / Healthy Weight** ($18.5 - 24.9$)
  - 🟠 **Overweight** ($25.0 - 29.9$)
  - 🔴 **Obese** ($\ge 30.0$)
- **Dynamic Pointer Badge**: Floats over your exact mathematical position on the BMI spectrum.
- **Actionable Target Statement**: Tells you exactly how many kilograms you are from your optimal healthy weight range (e.g., *"Lose 4.2 kg to reach optimal range (58.2 – 78.4 kg)"*).

---

### 3. Interactive Daily Dashboard & Plate Macro Ring
Your central daily nutrition command center:
- **Signature Plate Macro Ring**: Visual SVG chart dividing daily consumption into protein, carbs, and fat segments filling up in real-time against your ceiling.
- **4 Meal Slots**: Dedicated tracking for *Breakfast*, *Lunch*, *Dinner*, and *Snacks & Extras*.
- **Quick Logging**: Add items, adjust gram quantities, or delete entries with immediate subtotal updates.
- **Energy Metric Badges**: Live display of consumed kcal vs. remaining daily budget.

---

### 4. AI Vision Meal Scanner
Snap a picture or upload a photo of your meal:
- **Intelligent Recognition**: Detects multiple food items on a plate simultaneously.
- **Portion Estimation**: Accurately estimates portion sizes in grams.
- **Human-in-the-Loop Review**: Review recognized items and adjust quantities before adding them to your daily log.
- **Resilient Pipeline**: Client-side image compression, non-blocking background telemetry, and graceful fallback handling.

---

### 5. Fully Customizable 7-Day Adaptive Meal Plan
A practical, goal-oriented weekly plan:
- **Auto-Generated Starting Point**: Balanced meals generated to hit your exact calorie and macro targets.
- **Complete Freedom**: Delete any item, search the full database, and insert custom alternatives.
- **Live Day & Slot Recalculations**: Displays macro and calorie totals for each meal slot and the entire day.
- **No Rigid Lock-In**: Eat what is available in your fridge or market without breaking your diet plan.

---

### 6. Universal Bi-Lingual Food Catalog
Comprehensive database tailored for everyday reality:
- **Rich Bengali Library**: Bhaat, Roti, Moong Dal, Masoor Dal, Ilish Bhapa, Rui Macher Jhol, Dim Bhaji, Begun Bhorta, Khichuri, etc.
- **Western & Global Staples**: Rolled oats, whey isolate, chicken breast, peanut butter, brown rice, whole wheat bread, eggs, tuna, Greek yogurt.
- **Packaged Items**: Local and international branded foods with verified nutritional labels.
- **Flexible Units**: Log by grams, pieces, bowls, or standard servings.

---

### 7. Interactive Weight & Adherence Analytics
Monitor your long-term body composition journey:
- **Dynamic SVG Weight Trend Chart**: Visualizes your daily weigh-ins over time plotted against your starting weight and target weight line.
- **Consistency & Streak Metrics**: Track weekly logging adherence percentages and active tracking streaks.
- **Historical Log**: Review past weigh-ins and progression records.

---

### 8. Home Workouts & Evidence-Based Nutrition Principles
Fitness isn't just calories — it's lifestyle:
- **No-Equipment Home Workouts**:
  - ⚡ *Full Body Circuit*: Push-ups, bodyweight squats, lunges, and mountain climbers.
  - 🧘 *Core Strength Routine*: Planks, bicycle crunches, leg raises, bird-dogs.
  - 🌅 *Morning Mobility*: Cat-cow stretches, thoracic rotations, deep squats.
- **Evidence-Based Nutrition Guidelines**:
  - 🥩 *Protein Distribution*: 25–40g per meal for muscle protein synthesis.
  - 🥗 *Fiber Intake*: 25–35g daily for gut health, satiety, and steady blood sugar.
  - 💧 *Hydration Formula*: 35 ml per kg body weight daily.
  - ⚡ *Safe Caloric Deficits*: Why 300–500 kcal deficits protect metabolic health.
- **Daily Mindset Inspiration**: Dynamic rotating motivational thoughts on consistency and health.

---

### 9. Offline-First Resilience
Designed to work under poor or zero internet connectivity:
- **Dexie.js IndexedDB Store**: Your profile, active diet plan, food logs, and catalog cache exist directly in your browser.
- **Background Sync Engine**: All logged items are queued locally in an idempotent event queue and synced smoothly once connectivity is restored.
- **Zero Data Loss**: Never lose an entry because of a dropped cell signal.

---

## 📊 Comparison: AmarDiet vs. Conventional Apps

| Feature | AmarDiet (Thali Tracker) | Traditional Western Apps (MyFitnessPal, etc.) | Static PDF / Diet Templates |
| :--- | :---: | :---: | :---: |
| **Authentic Bengali Dishes** | ✅ Native (Bhaat, Dal, Bhorta, Mach) | ❌ Inaccurate user submissions | ⚠️ Static / Inflexible |
| **Bilingual Search (Bangla + EN)** | ✅ Full support | ❌ English only | ❌ None |
| **100% Freeform Meal Customization** | ✅ Swap any item, anytime | ❌ Often locks plans behind paywalls | ❌ Completely static |
| **Deterministic Scientific Math** | ✅ Pure Mifflin-St Jeor | ⚠️ Varied / Inconsistent | ⚠️ Generic one-size-fits-all |
| **Offline-First Functionality** | ✅ Full offline logging & sync | ❌ Constant connection required | ✅ (Static text only) |
| **Visual BMI Spectrum & Delta** | ✅ Dynamic scale + kg target | ⚠️ Basic number only | ❌ None |
| **AI Meal Photo Scanner** | ✅ Client-compressed + editable | ⚠️ Expensive premium tier only | ❌ None |
| **Home Workouts & Nutrition Rules** | ✅ Built-in & free | ⚠️ Requires separate subscription | ❌ None |

---

## 🏗️ Technical Architecture

AmarDiet is built as a high-performance **modular monorepo** using clean architecture:

```
Personalized_diet/
├── apps/
│   ├── web/                    # Next.js 14 App Router, React, Tailwind CSS, Zustand, Dexie.js
│   │   ├── app/                # Routes: /, /dashboard, /plan, /tracker, /progress, /onboarding, /admin
│   │   ├── components/         # BmiSpectrumChart, PlateRingChart, Navbar, UI components
│   │   ├── features/           # FoodSearchModal, MealScanModal, OnboardingFlow
│   │   └── lib/                # IndexedDB database, Sync Engine, Identity, i18n
│   └── api/                    # Fastify TypeScript REST API
│       └── src/
│           ├── modules/        # Profile, Food Search, Food Logs, Diet Plan, Progress, AI Vision
│           └── plugins/        # Rate limiting, Error handling, Auth
├── packages/
│   ├── nutrition-engine/       # Deterministic clinical math (BMR, TDEE, Calorie/Macro splits)
│   ├── food-data/              # Seed catalog of 100+ verified Bengali & Western foods
│   ├── schemas/                # Zod validation schemas for all entities and API payloads
│   ├── domain/                 # Core business domain models & error classes
│   └── types/                  # Shared TypeScript type definitions
├── database/                   # Drizzle ORM schema, migrations, and PostgreSQL connection
└── tests/                      # Unit, integration, and Playwright E2E test suites
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **pnpm**: v9.0.0 or higher
- **PostgreSQL**: Optional (app runs on high-speed in-memory storage if no `DATABASE_URL` is configured)

### 1. Clone & Install
```bash
git clone https://github.com/mehediakash01/AmarDiet.git
cd Personalized_diet
pnpm install
```

### 2. Configure Environment (Optional)
```bash
cp apps/api/.env.example apps/api/.env
```
*(If no Postgres instance is set, the API automatically falls back to in-memory mode for development and testing).*

```bash
# Apply database migrations
pnpm db:migrate

# Seed baseline Bengali foods (source = SEED)
pnpm db:seed

# Expand food catalog with curated USDA & Open Food Facts subsets (idempotent dedupe)
pnpm db:import

# Or run import in dry-run mode (simulation without DB writes)
pnpm db:import --dry-run
```

### 3. Run Development Servers
```bash
# Starts both Next.js Web (port 3000) and Fastify API (port 3001) concurrently
pnpm dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Run Test Suite
```bash
# Run unit and integration tests across packages
pnpm test

# Build all packages cleanly
pnpm build
```

---

## 🎨 Design System & Colors

The design balances **warmth and approachability** on the public landing page with **clean, utilitarian clarity** on daily tracking tools:

| Token | Hex | Role |
| :--- | :--- | :--- |
| **Background** | `#F7F3E8` | Warm off-white canvas that reduces eye strain |
| **Primary** | `#1F4D3E` | Deep botanical green — navigation, primary CTAs, active highlights |
| **Accent** | `#C98A2C` | Warm gold — confirmations, badges, energetic focal points |
| **Secondary** | `#5A3E85` | Deep indigo — insights, tips, analytical indicators |
| **Warning** | `#B0472F` | Terracotta red — calorie/macro target exceedances only |
| **Surface** | `#FFFDF9` | Clean card background |
| **Border** | `#DFD7C2` | Crisp, natural separation lines |
| **Text** | `#1B1B18` | Soft near-black for high legibility |

---

## 🤝 Contributing & License
Contributions, feedback, and suggestions to expand the food catalog or enhance features are welcome!

Made with ❤️ for healthier lifestyles everywhere.
