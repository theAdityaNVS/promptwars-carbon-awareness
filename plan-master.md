# Carbon Footprint Awareness Platform — PromptWars Challenge 3 — Master Plan

## Context

We're building a hackathon submission for "PromptWars Challenge 3: Carbon Footprint Awareness Platform." The repo is currently empty (only `CHALLENGE.md`). Hard constraints: <10MB repo, single branch, public GitHub repo, deployed link required, README documenting vertical/approach/assumptions. Scoring weights heavily favor **Problem Statement Alignment** and **Code Quality**, with Security/Efficiency as medium and Testing/Accessibility as low (but still graded — can't skip entirely).

User-confirmed decisions:
- **Persona**: Urban Commuter & Smart Consumer — tracks daily transport (car/bus/bike/EV/walk), shopping/diet habits, and home energy use.
- **Assistant engine**: Hybrid — a deterministic TypeScript rules/heuristics engine is the source of truth and always works offline/keyless; an optional LLM route (Claude API) rephrases/elaborates its output into more natural language when an API key is present, with graceful fallback to the raw rule-based insight otherwise.
- **Deployment**: Vercel.

Goal: a lightweight, judge-proof, clean-code Next.js app that lets a user log daily carbon-relevant actions, see a running footprint estimate, and get personalized, context-aware reduction tips from the assistant.

## Tech Stack

- **Framework**: Next.js 14 (App Router), TypeScript strict mode.
- **Styling**: Tailwind CSS (small footprint, no component lib bloat).
- **State**: Zustand with a `persist` middleware backed by `localStorage` — no backend DB, keeps repo/runtime tiny and removes an entire class of security surface (no DB credentials to leak).
- **Validation**: Zod for input schemas (log entries, assistant query payload) — covers the "safe user-input sanitization" security criterion cleanly.
- **LLM (optional layer)**: `@anthropic-ai/sdk`, called only from a server route (`/api/assistant`), key read from `process.env.ANTHROPIC_API_KEY` via `.env.local` (gitignored). Route checks for key presence and falls back to pure rules output if absent — so the deployed demo works whether or not a key is configured on Vercel.
- **Testing**: Vitest + React Testing Library (lightweight, fast, no Jest config overhead). Focus tests on the carbon calculation engine and the rules engine (pure functions — highest ROI for "Testing" criterion despite low weight).
- **Lint/Format**: ESLint (next/core-web-vitals + typescript-eslint), Prettier.

This keeps node_modules out of the repo (gitignored) and the actual source under a few hundred KB — comfortably under 10MB even with lockfile included.

**Repo root**: the Next.js app lives at the repo root (not nested under `carbon-tracker/`) — `CHALLENGE.md` stays alongside it. Simpler Vercel root-dir config and a cleaner 10MB measurement (no nested-folder confusion).

## Architecture & Directory Map

```
.
├── .env.local.example          # documents ANTHROPIC_API_KEY=, never committed with real value
├── .gitignore                  # node_modules, .next, .env*.local, .vercel
├── .eslintrc.json
├── README.md                   # vertical, approach, logic, assumptions
├── CHALLENGE.md                # existing challenge spec, kept as-is
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                # root layout, fonts, ARIA landmarks
│   │   ├── page.tsx                  # dashboard: today's footprint + trend + assistant panel
│   │   ├── globals.css
│   │   ├── log/
│   │   │   └── page.tsx              # action-logging form (transport/diet/energy)
│   │   ├── insights/
│   │   │   └── page.tsx              # history, trends, weekly comparison
│   │   └── api/
│   │       └── assistant/
│   │           └── route.ts          # POST: rules engine -> optional LLM rephrase -> response
│   ├── components/
│   │   ├── layout/
│   │   │   ├── NavBar.tsx
│   │   │   └── PageShell.tsx
│   │   ├── dashboard/
│   │   │   ├── FootprintSummaryCard.tsx
│   │   │   ├── TrendChart.tsx        # lightweight inline SVG, no charting lib dependency
│   │   │   └── AssistantPanel.tsx    # chat-style UI, context-aware suggestion chips
│   │   ├── log/
│   │   │   ├── ActionLogForm.tsx
│   │   │   └── CategorySelector.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Badge.tsx
│   ├── lib/
│   │   ├── carbon/
│   │   │   ├── factors.ts            # emission factor constants (kg CO2e per unit, sourced/commented)
│   │   │   ├── calculate.ts          # pure functions: entry -> kg CO2e
│   │   │   └── calculate.test.ts
│   │   ├── assistant/
│   │   │   ├── rulesEngine.ts        # pure: (history, latestEntry) -> Insight[] (context-aware logic)
│   │   │   ├── rulesEngine.test.ts
│   │   │   ├── llmClient.ts          # thin Anthropic SDK wrapper, server-only
│   │   │   └── prompt.ts             # system prompt template for rephrasing rule output
│   │   ├── state/
│   │   │   ├── useLogStore.ts        # Zustand store: entries, persisted to localStorage
│   │   │   └── selectors.ts          # derived data: weekly totals, category breakdown
│   │   └── utils/
│   │       ├── validation.ts         # Zod schemas for log entries + assistant requests
│   │       └── date.ts
│   └── types/
│       └── index.ts                  # LogEntry, Category, Insight, AssistantResponse
├── tests/
│   └── setup.ts                      # RTL/vitest setup
└── public/
    └── (no large binary assets — icons via inline SVG)
```

## Core Engineering Features

### 1. Carbon calculation logic & state persistence
- `lib/carbon/factors.ts` holds typed constant tables (e.g. `CAR_KM = 0.192 kgCO2e/km`, `BUS_KM = 0.105`, `BEEF_MEAL = 6.0`, `KWH_GRID = 0.45`), each with a one-line comment citing the general source category (DEFRA/EPA-style averages) — keeps the file auditable without pulling in a data-fetching dependency. It also holds an `AVERAGE_COMMUTER_BENCHMARKS` table (typical weekly km by mode, typical meals/week, typical kWh/week) so a single log entry can immediately be framed as "X% above/below average" without needing personal history.
- **Cold-start handling (critical for live judging — a fresh deploy has zero data)**: the dashboard's empty state offers two paths, both writing into the same `useLogStore`: (a) a one-click "Load a sample week" that seeds ~7 days of representative entries so the assistant has something to reason about immediately, and (b) a short baseline-onboarding step (typical commute mode + distance, rough diet pattern, rough home energy) captured once and stored as `userBaseline` in the store. The rules engine treats `userBaseline` and the benchmark table as fallback context whenever real history is thin, so insights fire from entry #1 instead of staying empty until a week of data accumulates.
- `lib/carbon/calculate.ts` exposes pure functions `calculateEntryFootprint(entry: LogEntry): number` and `aggregateByPeriod(entries, range)`. Pure functions = trivially unit-testable, satisfies Testing criterion and Efficiency (no re-computation, memoizable via selectors).
- `lib/state/useLogStore.ts`: Zustand store holding `LogEntry[]`, persisted via `zustand/middleware persist` to `localStorage` under a single namespaced key. No backend means no auth/DB surface to secure — directly supports the Security criterion's "protected routing" by having nothing sensitive server-side except the optional LLM key.
- `lib/state/selectors.ts` derives weekly/monthly totals and category breakdowns from the raw entries — keeps components free of calculation logic (clean separation, supports Code Quality).

### 2. Context-aware dynamic assistant
- `lib/assistant/rulesEngine.ts` is the "smart, dynamic assistant" core: given the user's entry history + most recent entry, it evaluates a prioritized set of heuristics (e.g. "3+ solo car trips this week vs. last week → suggest carpooling/transit, with delta kg CO2e shown", "red-meat frequency above weekly average → suggest one swap", "energy spike vs. rolling average → flag and suggest specific action"). Returns typed `Insight[]` with severity, category, message, and an estimated kg CO2e impact of acting on it — this is the "logical decision making based on user context" requirement satisfied without any external dependency.
- `app/api/assistant/route.ts`: validates the request body with Zod (including a max-length cap on any free-text field — this is a public, unauthenticated endpoint, so unbounded input is a real abuse/cost vector once a real API key is attached), runs `rulesEngine`, and — only if `ANTHROPIC_API_KEY` is set — passes the top insight(s) to `llmClient.ts` to rephrase into a more conversational tone via `prompt.ts`'s system prompt. Adds a lightweight in-memory per-IP request cap (e.g. token-bucket, N requests/minute) as a first line of defense against the route being hammered or used as a free LLM proxy. Uses `claude-haiku-4-5` for the rephrase call specifically — it's a cheap rewrite task, not a reasoning task, and keeps cost trivial even if the route is hit unexpectedly hard. On any LLM error/timeout/missing key/rate-limit, it returns the raw rules-engine output unchanged. This guarantees the assistant always responds, which matters a lot for live judging.
- `components/dashboard/AssistantPanel.tsx`: chat-style panel showing the latest insight plus quick-reply suggestion chips ("Log a bike trip", "Show me my biggest category") that re-trigger the engine with synthetic context — gives the "dynamic assistant interface" feel without needing free-text NLP for the core flow.

### 3. Personalized actionable insight loop
- Insights are not one-shot: each `Insight` carries a `relatedAction` the user can apply directly from the panel (e.g. clicking "I'll do this" pre-fills `log/page.tsx` with the suggested entry type), closing the loop from insight → action → updated footprint → new insight.
- **Stretch goal (do not let this block shipping)**: `insights/page.tsx` cross-referencing which past suggestions were acted on (tagging entries that followed a suggestion) for a "you followed N tips, saving X kg CO2e" summary. This is the most scope-risky piece of the whole plan — build it last, after the core insights page is already working, and drop it without regret if time runs short.

## Security, Efficiency, Testing & Accessibility — how the plan covers each criterion

- **Security**: no hardcoded secrets (key only via `.env.local`, real value never committed, `.env.local.example` documents the shape); Zod validation at every input boundary (log form, assistant API route); no DB/auth surface to misconfigure; API route is the only server code and it fails closed (no key → no external call).
- **Efficiency**: pure-function calculation/rules engine (cheap, memoizable), client-side state with no network round-trip for core tracking flow, no charting library (inline SVG trend), Next.js automatic code-splitting per route.
- **Testing**: Vitest unit tests on `calculate.ts` and `rulesEngine.ts` (the two highest-value pure-logic modules) plus one RTL smoke test on `ActionLogForm`. Small but meaningful — proportionate to the criterion's low weight without skipping it.
- **Accessibility**: semantic landmarks (`<nav>`, `<main>`, `<form>`), labeled form inputs, ARIA live region on `AssistantPanel` for new insights, sufficient color contrast in the Tailwind theme, keyboard-navigable suggestion chips.

## Sub-Plans

This app is frontend-heavy with a single serverless route, so a literal "backend/frontend" split would leave one file nearly empty. Split along the actual architecture instead — see the four sub-plan files in this directory:

1. [`plan-core-domain.md`](./plan-core-domain.md) — pure-logic "backend": factors, calculation, rules engine, types, validation.
2. [`plan-frontend-ui.md`](./plan-frontend-ui.md) — pages, components, state store, baseline onboarding, accessibility.
3. [`plan-assistant-api.md`](./plan-assistant-api.md) — the serverless route, LLM client, rate limiting, panel wiring.
4. [`plan-infra-quality.md`](./plan-infra-quality.md) — scaffold, tooling, tests, README, deploy, repo-size check.

Each sub-plan inherits the Context and stack decisions above and references this file rather than restating them.

## Step-by-Step Implementation Milestones

**Phase 1 — Scaffold & Core Data Layer** (see `plan-infra-quality.md` + `plan-core-domain.md`)
- `create-next-app` (TS, Tailwind, App Router, ESLint), set up `.gitignore`, `.env.local.example`, Vitest config.
- Build `types/index.ts`, `lib/carbon/factors.ts` + `calculate.ts` + tests, `lib/utils/validation.ts`.
- Verify: `npm run test` passes on calculation unit tests; `npm run build` succeeds.

**Phase 2 — Tracking UI & State** (see `plan-frontend-ui.md`)
- `lib/state/useLogStore.ts` + `selectors.ts`, `components/log/ActionLogForm.tsx` + `CategorySelector.tsx`, `app/log/page.tsx`.
- Wire dashboard (`app/page.tsx`) to show today's/weekly footprint via `FootprintSummaryCard` and `TrendChart`.
- Verify: manually log entries in browser, confirm localStorage persistence survives refresh, confirm totals match hand-calculated expected values.

**Phase 3 — Assistant Engine & API** (see `plan-core-domain.md` + `plan-assistant-api.md`)
- `lib/assistant/rulesEngine.ts` + tests, `lib/assistant/llmClient.ts` + `prompt.ts`, `app/api/assistant/route.ts`.
- `components/dashboard/AssistantPanel.tsx` wired to the API route; implement the insight → suggested action → pre-filled log form loop.
- Verify: test panel with no `ANTHROPIC_API_KEY` set (rules-only output works), then with a key set locally (rephrased output works); confirm graceful fallback on simulated API failure.

**Phase 4 — Insights Page, Polish, Accessibility, Ship** (see `plan-frontend-ui.md` + `plan-infra-quality.md`)
- `app/insights/page.tsx` (trends, acted-on suggestions stretch goal), accessibility pass (labels/ARIA/contrast), README (vertical, approach, logic, assumptions), final lint/typecheck pass.
- Push to a single-branch public GitHub repo, deploy to Vercel, confirm deployed link works end-to-end (log → dashboard → assistant → insights), record final repo size (`du -sh` excluding `.git`/`node_modules`).
- Verify: full manual walkthrough on the deployed Vercel URL exactly matching the README's described flow.
