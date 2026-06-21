# Sub-Plan: Infra, Tooling & Quality

> Inherits Context and Tech Stack from [`plan-master.md`](./plan-master.md). Covers everything that isn't feature code: scaffold, config, tests, docs, deploy.

## Files

```
package.json
tsconfig.json
tailwind.config.ts
vitest.config.ts
.eslintrc.json
.gitignore
.env.local.example
README.md
tests/setup.ts
```

## Scaffold

- `npx create-next-app@latest . --typescript --tailwind --app --eslint` run at the repo root (not nested — `CHALLENGE.md` stays alongside the app per `plan-master.md`'s repo-root decision).
- Add `zustand`, `zod`, `@anthropic-ai/sdk` as dependencies; `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as devDependencies.
- `tsconfig.json`: enable `strict: true`.

## `.gitignore`

Must include (beyond the Next.js default): `node_modules`, `.next`, `.env*.local`, `.vercel`, `coverage`. This is what keeps the repo under the 10MB limit — the limit applies to what's committed, not `node_modules`.

## `.env.local.example`

```
# Optional: enables LLM-rephrased assistant responses.
# Without this, the assistant runs on the deterministic rules engine only — fully functional either way.
ANTHROPIC_API_KEY=
```

## `vitest.config.ts` + `tests/setup.ts`

Minimal Vitest config pointed at `src/**/*.test.ts(x)`, jsdom environment for the one RTL component test, `tests/setup.ts` importing `@testing-library/jest-dom` matchers.

## Lint/Format

- ESLint: `next/core-web-vitals` + `@typescript-eslint/recommended`. No custom rule overrides unless something in code mode proves genuinely noisy.
- Prettier: default config, run via `npm run format` (not enforced in CI for this hackathon scope — just keep it available).

## README.md (required submission field)

Must explicitly cover, per the challenge's "What to Submit" requirements:
- **Chosen vertical**: Urban Commuter & Smart Consumer, and why.
- **Approach and logic**: rules-engine-first assistant architecture, optional LLM rephrase layer, cold-start handling (sample data / baseline onboarding).
- **How the solution works**: the log → calculate → insight → action loop, walked through concretely.
- **Assumptions made**: emission factors are average/approximate (not location-specific), no auth/multi-user support (single-browser localStorage), rate limiting is best-effort in-memory (resets on cold start, fine for hackathon scale).
- Link to the deployed Vercel URL.

## Deploy

- Push to a **single-branch** public GitHub repo (no feature branches — commit directly per the challenge's git-structure rule).
- Connect the repo to Vercel, set `ANTHROPIC_API_KEY` in Vercel's project env vars **only if** a key is available — the app must demo correctly either way per `plan-assistant-api.md`'s fallback design.
- After first deploy, run a repo size check: `git clone` fresh and check size **excluding `.git`** (or check the GitHub "Code" tab size indicator), confirm comfortably under 10MB.

## Verification (full pipeline)

1. `npm run lint` — zero errors.
2. `npm run typecheck` (`tsc --noEmit`) — zero errors.
3. `npm run test` — all unit/component tests pass (`calculate.test.ts`, `rulesEngine.test.ts`, `ActionLogForm` smoke test).
4. `npm run build` — succeeds, no warnings about missing env vars breaking the build (the build must succeed with `ANTHROPIC_API_KEY` unset).
5. Deployed Vercel URL: full manual walkthrough — cold start → load sample week or set baseline → see assistant insight → log a real entry → see updated footprint and insights page — matches what the README describes.
6. Confirm single branch, public visibility, and repo size in the GitHub UI before final submission.
