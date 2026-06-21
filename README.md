# Carbon Footprint Awareness Platform

A submission for **PromptWars Virtual Challenge 3**. A lightweight Next.js app that lets a user log daily carbon-relevant actions, see a running footprint estimate, and get personalized, context-aware reduction tips from a built-in assistant.

## Chosen Vertical

**Urban Commuter & Smart Consumer** — someone who wants to understand the footprint of everyday choices: daily commute (car / bus / bike / EV / walk), diet (meals logged by type), and home energy use. The app turns those small, repeated decisions into a visible running total and concrete next actions.

## Approach & Logic

The core design goal was a **context-aware assistant that is never broken**, even on a fresh deploy with zero history and no API key configured:

- **Deterministic rules engine is the source of truth.** `src/lib/assistant/rulesEngine.ts` is a pure function that takes the user's entry history (or, if history is thin, a one-time baseline/benchmark fallback) and returns prioritized, typed insights — e.g. "3+ solo car trips this week vs. last week → try transit, here's the kg CO2e you'd save." This works fully offline, with no external calls, so the demo can never appear "broken" to a judge regardless of environment.
- **Optional LLM layer only rephrases tone.** `src/app/api/assistant/route.ts` runs the rules engine first, then — only if `ANTHROPIC_API_KEY` is present — sends the top insight to Claude Haiku for a more conversational rewrite. On any missing key, timeout, or API error, it falls back to the raw rules-engine output unchanged. The assistant's *logic* never depends on the LLM; the LLM only polishes presentation.
- **Cold-start handling.** A brand-new user has no data, which would otherwise make a "context-aware" assistant look empty/broken on first load. The dashboard offers a "load a sample week" seed and a short baseline-onboarding form, both feeding the same rules engine so insights appear from the very first interaction.
- **No backend/database.** State lives in a Zustand store persisted to `localStorage`. This keeps the app small, fast, and removes an entire class of security surface (no DB credentials, no auth, nothing sensitive server-side besides an optional, fail-closed LLM key).

## How the Solution Works

1. **Log an action** (`/log`) — pick a category (transport, diet, energy) and enter the relevant detail. Input is validated with Zod before it touches state.
2. **Dashboard** (`/`) — shows today's/weekly footprint total and a trend chart (inline SVG, no charting library) computed by pure functions in `src/lib/carbon/calculate.ts` from typed emission-factor constants in `src/lib/carbon/factors.ts`.
3. **Assistant panel** — reads the current history through the rules engine and surfaces the highest-priority insight, with a quick action to log the suggested behavior, closing the loop from insight → action → updated footprint → new insight.
4. **Insights** (`/insights`) — full activity history and trend comparison against the user's own baseline.

## Assumptions

- Emission factors are general-purpose averages (DEFRA/EPA-style), not region-specific — accuracy of absolute numbers is secondary to giving directionally correct, comparable feedback.
- A single local user/session is assumed (no multi-user accounts); data is private to the browser via `localStorage`.
- The optional LLM rephrasing step is a convenience layer, not a requirement — the app is fully functional and "smart" without any API key configured.

## Tech Stack

Next.js (App Router) + TypeScript, Tailwind CSS, Zustand (`persist` → `localStorage`), Zod validation, Vitest + React Testing Library, optional `@anthropic-ai/sdk` (Claude Haiku) for tone rephrasing, deployed on Vercel.

## Running Locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The assistant works immediately with no configuration. To enable LLM rephrasing, set `ANTHROPIC_API_KEY` in a local `.env.local` file.

```bash
pnpm test       # unit tests (calculation engine, rules engine, form UI)
pnpm lint        # eslint
pnpm typecheck   # tsc --noEmit
```
