# Sub-Plan: Core Domain Logic

> Inherits Context and Tech Stack from [`plan-master.md`](./plan-master.md). This is the pure-logic "backend" of the app — framework-free, fully unit-testable.

## Files

```
src/types/index.ts
src/lib/utils/validation.ts
src/lib/utils/date.ts
src/lib/carbon/factors.ts
src/lib/carbon/calculate.ts
src/lib/carbon/calculate.test.ts
src/lib/assistant/rulesEngine.ts
src/lib/assistant/rulesEngine.test.ts
```

## `types/index.ts`

Core domain types, no framework imports:

- `Category = 'transport' | 'diet' | 'energy'`
- `TransportMode = 'car_solo' | 'car_shared' | 'bus' | 'train' | 'bike' | 'walk' | 'ev'`
- `LogEntry` — `{ id, date (ISO string), category, mode/subtype, quantity, unit }`
- `UserBaseline` — `{ commuteMode, commuteKmPerWeek, dietPattern, kwhPerWeek }` (captured once during onboarding, see `plan-frontend-ui.md`)
- `Insight` — `{ id, category, severity: 'info'|'tip'|'warning', message, estimatedImpactKg, relatedAction?: Partial<LogEntry> }`
- `AssistantResponse` — `{ insights: Insight[], source: 'rules'|'rules+llm' }`

## `lib/carbon/factors.ts`

Typed constant tables, each entry with a one-line source comment:

```ts
export const EMISSION_FACTORS = {
  car_solo: 0.192,   // kg CO2e/km, average ICE passenger car, single occupant
  car_shared: 0.096,  // halved, 2-occupant carpool approximation
  bus: 0.105,         // kg CO2e/km, average urban bus per passenger
  train: 0.041,       // kg CO2e/km, average rail per passenger
  bike: 0,
  walk: 0,
  ev: 0.053,          // kg CO2e/km, average grid-charged EV
  beef_meal: 6.0,      // kg CO2e per meal, beef-based
  chicken_meal: 1.5,
  vegetarian_meal: 0.6,
  kwh_grid: 0.45,      // kg CO2e/kWh, average grid mix
} as const
```

Plus `AVERAGE_COMMUTER_BENCHMARKS`: typical weekly km by mode, typical meals/week by type, typical kWh/week — used by the rules engine as a fallback comparison baseline when personal history is thin (see Cold-Start below).

## `lib/carbon/calculate.ts`

Pure functions only:

- `calculateEntryFootprint(entry: LogEntry): number` — looks up the right factor, multiplies by quantity.
- `aggregateByPeriod(entries: LogEntry[], range: { from: string; to: string }): { total: number; byCategory: Record<Category, number> }`
- `compareToBaseline(entries: LogEntry[], baseline: UserBaseline): { deltaPercent: number; category: Category }[]`

No I/O, no React, no Date.now()/Math.random() — deterministic and trivially testable.

## `lib/assistant/rulesEngine.ts` — the "smart, dynamic assistant" core

Signature: `generateInsights(history: LogEntry[], baseline: UserBaseline | null): Insight[]`

Evaluates a prioritized, ordered list of heuristics, returning the top 1-3 matches:

1. **Trend heuristics** (need ≥2 weeks of history): this-week vs last-week per category, e.g. "3+ solo car trips this week vs last week → suggest carpooling/transit."
2. **Frequency heuristics**: red-meat meals above weekly average → suggest one swap, with estimated kg CO2e saved.
3. **Spike heuristics**: any single entry >2x the rolling category average → flag specifically.
4. **Cold-start fallback heuristics** (fire when history is thin, <3 entries): compare the single available entry (or `userBaseline`) against `AVERAGE_COMMUTER_BENCHMARKS` instead of personal history — e.g. "your daily car commute is 40% above the average commuter's." This guarantees the engine produces a meaningful insight on entry #1, not just after a week of data.

Each `Insight.estimatedImpactKg` is computed via `calculate.ts` functions, not hardcoded, so it stays consistent with the displayed footprint numbers.

## `lib/utils/validation.ts`

Zod schemas:
- `logEntrySchema` — validates category/mode enum membership, quantity bounds (e.g. 0–1000), date format.
- `assistantRequestSchema` — validates the shape sent to `/api/assistant` (see `plan-assistant-api.md`), including a max-length cap (e.g. 500 chars) on any free-text field to bound the LLM rephrase payload.
- `userBaselineSchema` — validates onboarding input.

## Tests

- `calculate.test.ts`: known entry → known kg CO2e for each category/mode; `aggregateByPeriod` sums correctly across mixed categories; `compareToBaseline` percent math.
- `rulesEngine.test.ts`: cold-start fallback fires with <3 entries and a baseline; trend heuristic fires when week-over-week car trips increase; no insights crash on empty/malformed input (defensive but not over-engineered — Zod has already validated entries by the time they reach this engine).

## Verification

`npm run test -- calculate rulesEngine` passes; manually trace one example by hand (e.g. 10km solo car commute × 0.192 = 1.92 kg CO2e) and confirm the function output matches.
