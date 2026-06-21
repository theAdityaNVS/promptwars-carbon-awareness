# Sub-Plan: Frontend / UI

> Inherits Context and Tech Stack from [`plan-master.md`](./plan-master.md). Consumes the domain logic from [`plan-core-domain.md`](./plan-core-domain.md) and calls the route defined in [`plan-assistant-api.md`](./plan-assistant-api.md).

## Files

```
src/app/layout.tsx
src/app/page.tsx
src/app/globals.css
src/app/log/page.tsx
src/app/insights/page.tsx
src/components/layout/NavBar.tsx
src/components/layout/PageShell.tsx
src/components/dashboard/FootprintSummaryCard.tsx
src/components/dashboard/TrendChart.tsx
src/components/dashboard/AssistantPanel.tsx
src/components/dashboard/OnboardingPrompt.tsx
src/components/log/ActionLogForm.tsx
src/components/log/CategorySelector.tsx
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/Badge.tsx
src/lib/state/useLogStore.ts
src/lib/state/selectors.ts
```

## State: `lib/state/useLogStore.ts`

Zustand store, persisted via `zustand/middleware persist` to `localStorage` under a single key (e.g. `carbon-tracker-store`):

```ts
interface LogStore {
  entries: LogEntry[]
  baseline: UserBaseline | null
  addEntry: (entry: LogEntry) => void
  setBaseline: (baseline: UserBaseline) => void
  loadSampleWeek: () => void   // cold-start seed, see below
}
```

`lib/state/selectors.ts` derives weekly/monthly totals and category breakdowns from `entries` using `aggregateByPeriod` from the domain layer — components never compute footprint math directly.

## Cold-start flow (critical — see `plan-core-domain.md` rationale)

`components/dashboard/OnboardingPrompt.tsx` renders when `entries.length === 0 && baseline === null`, offering two equally-prominent actions:

1. **"Load a sample week"** — calls `loadSampleWeek()`, which seeds ~7 days of representative entries (mixed transport/diet/energy) directly into the store. Instant, no form-filling, good for a judge who just wants to see the app work.
2. **"Set up my baseline"** — a 3-question micro-form (typical commute mode + distance, rough diet pattern, rough weekly energy) that calls `setBaseline()`. Lets a real user get personalized insights from entry #1 without fabricated data.

Both paths unblock `AssistantPanel` immediately — the rules engine's cold-start fallback (see core-domain plan) only needs one of `entries` or `baseline` to produce a meaningful insight.

## Pages

- **`app/page.tsx` (dashboard)**: renders `OnboardingPrompt` (conditionally), `FootprintSummaryCard` (today/week totals via selectors), `TrendChart` (last 14 days, inline SVG polyline — no charting dependency), and `AssistantPanel`.
- **`app/log/page.tsx`**: `ActionLogForm` with `CategorySelector` (transport/diet/energy tabs), each rendering the relevant fields (mode + distance for transport, meal type for diet, kWh for energy). Accepts an optional `?suggest=` query param so a clicked `Insight.relatedAction` can pre-fill the form (closes the insight → action loop).
- **`app/insights/page.tsx`**: trend view (weekly bar/line via `TrendChart` reused with different data), category breakdown. The "acted-on suggestions" cross-reference is a stretch goal per the master plan — build only after this page's core view works.

## Accessibility pass

- Semantic landmarks: `<nav>` in `NavBar`, `<main>` in `PageShell`, `<form>` in `ActionLogForm`.
- Every form input has a associated `<label>`; required fields use `aria-required`.
- `AssistantPanel` wraps new insights in an `aria-live="polite"` region so screen readers announce new tips without focus theft.
- Suggestion chips are real `<button>` elements (keyboard-focusable, `Enter`/`Space` activate) — not clickable `<div>`s.
- Tailwind theme uses a dark-mode-by-default palette per the user's global design preferences, with contrast-checked accent colors (WCAG AA minimum on text/background pairs).

## Verification

- Manual: log entries of each category, refresh the page, confirm `localStorage` persistence survives.
- Manual: clear `localStorage`, reload, confirm `OnboardingPrompt` appears and both paths (sample week / baseline) unblock the dashboard and produce at least one `AssistantPanel` insight.
- `npm run test -- ActionLogForm` (one RTL smoke test: form renders, required fields validated, submit calls `addEntry`).
- Keyboard-only pass: tab through dashboard → log form → insights without a mouse, confirm all interactive elements are reachable.
