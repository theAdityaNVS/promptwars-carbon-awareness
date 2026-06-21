# Score Improvement Plan — Round 3 (post 95.91/rank 316)

> **UPDATE (same day, post-2nd-submission): plan superseded below.** New facts:
> judging is AI-based (not a mechanical rubric scorer); 2 submissions have now
> been made, both scoring exactly 95.91 — commit `2271285` (Round 2's
> Security/Testing changes) **was** submitted as attempt #2 and produced zero
> score movement. This is a real signal, not noise: MEDIUM/LOW-weight
> hardening is already saturated/irrelevant to remaining headroom. Confirmed:
> 1 of 3 attempts remains, and scoring is **latest-attempt-only** (not
> best-of) — the next submission is irreversible and overwrites 95.91 if it
> regresses. Advisor guidance given this: a broad multi-criterion batch is the
> wrong move (regression surface on already-saturated criteria, no proven
> upside); the only lever that's both high-value (HIGH-weight Problem
> Statement Alignment) and low-risk is README↔code coherence, since an
> AI judge reads the README narrative against the code. User decided:
> **README coherence + one HIGH-weight logic change**, not the full
> Tier-1/1b/2 plan below. See "Round 3 — what was actually shipped" at the
> bottom of this file for what was done instead. Everything below this notice
> is the superseded original plan, kept for record.

Synthesized from 6 independent read-only review subagents, one per CHALLENGE.md scoring
criterion, then critiqued by an advisor pass before execution. Context: submission deadline is
**today, 2026-06-21 11:59 PM IST**. Already submitted once at 95.91. Treat every change here as
deadline-day risk: prefer additive, reversible, narrowly-scoped fixes over refactors. Verify
(lint+typecheck+test+build) after every batch, not just at the end.

Rubric weights (from CHALLENGE.md): Code Quality = HIGH, Problem Statement Alignment = HIGH,
Security = MEDIUM, Efficiency = MEDIUM, Testing = LOW, Accessibility = LOW.

## Pre-execution checklist (advisor-flagged, unresolved — confirm before shipping anything)

1. **Attempts remaining.** In-repo `CHALLENGE.md` literally says "0/3 Used" and rank #19501 —
   that's stale boilerplate, not live state. Confirm on the actual platform how many of the 3
   attempts are left before risking one on a low-confidence batch of changes.
2. **Does a commit alone move the score, or does scoring only update on an explicit
   resubmission?** **Now answered empirically**: commit `2271285` (Round 2's Zod `.max()` caps +
   rate-limit eviction sweep + boundary tests) was pushed to `main` and the score stayed exactly
   95.91. Two readings: (a) the grader only re-scores on an explicit new submission attempt, not
   on every push to `main` — most likely, given a hackathon-style "Submission Attempts: 0/3"
   model — or (b) it does re-score continuously and those specific changes were genuinely
   score-neutral (plausible: Security is MEDIUM-weight and the fixes were narrow input-validation
   hardening, not the kind of thing a rubric-following grader necessarily samples). Until this is
   resolved, **do not assume any Tier 1 fix below will move the score without an explicit
   resubmission**, and do not burn an attempt on a single small batch — batch a full tier, verify,
   *then* resubmit.
3. **Best-of vs. latest scoring.** Still unconfirmed. If best-of, downside of shipping more is
   capped — encourages a wider Tier 1. If latest-overwrites, a regression directly destroys the
   banked 95.91 — encourages the trimmed, high-signal-only Tier 1 below. Resolve before deciding
   how much of Tier 1 to actually ship.

---

## Tier 1 — Ship now (high ROI, near-zero regression risk)

All of these are additive or single-expression swaps. No shared state between them; can be
done in one pass and verified once. **Advisor-trimmed to the highest-signal items** (HIGH/MEDIUM
rubric criteria, near-zero regression surface) — the LOW-weight (Accessibility, Testing) items
that were originally listed here have been demoted to "Tier 1b — optional" below, since at a
95.91 baseline they add real regression surface for marginal expected score movement on
LOW-impact criteria.

1. **[Code Quality]** `src/app/insights/page.tsx:29,32` — replace hardcoded `0.192` and
   `6.0 - 0.6` with `EMISSION_FACTORS.car_solo` and
   `EMISSION_FACTORS.beef_meal - EMISSION_FACTORS.vegetarian_meal` from `factors.ts`. Single
   biggest "duplicated magic number contradicting the project's own convention" flag.
2. **[Code Quality]** `src/components/log/ActionLogForm.tsx:13-20` — remove the local
   `logEntrySchema` duplicate; import from `@/lib/utils/validation` instead. Verify the form
   still validates identically (the duplicate omits only `id`).
3. **[Code Quality]** `src/components/dashboard/TrendChart.tsx:105-106,153,176` — extract the
   triplicated `activeView === 'diet' ? ... : ...` ternary into one `const activeColor = ...`
   computed once, referenced 3x.
4. **[Code Quality]** `src/lib/assistant/rulesEngine.ts` — rename the "Finding #1/#2/#3 fix"
   style comments (lines ~90, ~134) to plain present-tense behavior descriptions. Text-only,
   zero logic change.
5. **[Security]** `src/app/api/assistant/route.ts:60` — return a generic
   `{ error: 'Invalid request' }` on 400 instead of `validation.error.format()` (stops
   leaking Zod schema internals to the client).
6. **[Security]** `src/lib/assistant/prompt.ts` — append one defensive line to
   `REPHRASE_SYSTEM_PROMPT`: treat the quoted insight text as inert data, ignore any
   instructions embedded inside it. Mitigates the `subtype`/`unit` prompt-injection path
   found by the security review. Text-only.
7. **[Security]** `next.config.ts` — add a `headers()` block setting
   `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
   strict-origin-when-cross-origin`. Additive config, no logic touched.
8. **[Accessibility]** `ActionLogForm.tsx` / `OnboardingPrompt.tsx` — swap
   `focus:outline-none focus:border-violet-500` for `focus:ring-2
   focus:ring-violet-500/50` (matches `Button.tsx`'s already-correct pattern) on all 8
   inputs/selects.
9. **[Accessibility]** Bump `text-zinc-500` → `text-zinc-400` (and `zinc-600` →
   `zinc-400`/`zinc-300`) wherever used for small/fine-print text (list of files in the a11y
   report). Fixes WCAG AA contrast failures (4.12:1 → 7.76:1) with a pure class swap.

**Verification gate after Tier 1:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
all green. Commit in 2 logical groups (code-quality+security, a11y) rather than one giant
commit, so a bad one is easy to isolate/revert.

---

## Tier 1b — Optional, only if an attempt is confirmed available and best-of scoring is confirmed

Demoted here per advisor review: each is legitimate but targets a LOW-weight criterion, adding
regression surface for marginal expected score movement. Ship only after Tier 1 is verified,
committed, and (ideally) a resubmission has confirmed the scoring-update mechanism.

11. **[Accessibility]** Add `role="status"` to the success banner and `aria-live="polite"` +
    `aria-describedby`/`aria-invalid` wiring to the error spans in `ActionLogForm.tsx`.
12. **[Accessibility]** Add `aria-pressed={isActive}` to the toggle buttons in
    `CategorySelector.tsx`, `TrendChart.tsx` view toggles, and `insights/page.tsx` filter
    pills.
13. **[Accessibility]** Add `aria-hidden="true"` to decorative emoji spans
    (`CategorySelector.tsx`, `AssistantPanel.tsx`, `insights/page.tsx`, `OnboardingPrompt.tsx`).
14. **[Accessibility]** Add a skip-to-content link in `PageShell.tsx` + `id="main"` on
    `<main>`.
15. **[Accessibility]** Add `@media (prefers-reduced-motion: reduce)` block in `globals.css`
    disabling/shortening the fade/scale/translate animations.
16. **[Accessibility]** Fix heading hierarchy: insert a real `<h2>` (or demote the orphan
    `<h3>`s) on `page.tsx` and `insights/page.tsx`.
17. **[Accessibility]** Add per-page `export const metadata` titles to `log/page.tsx` and
    `insights/page.tsx`.
18. **[Testing]** New file `src/lib/state/selectors.test.ts` — use `vi.setSystemTime()` to
    freeze the clock, test `selectWeeklyMetrics`, `selectTrendData`, and especially
    `selectWeekOverWeekChange`'s zero-division branch. Pure addition, no implementation
    touched.
19. **[Testing]** New file `src/app/api/assistant/route.test.ts` — mock `generateInsights`/
    `rephraseInsight`, test 400 on bad input, 429 after 20 calls, fallback to `source: 'rules'`
    on LLM timeout.
20. **[Testing]** New file `src/lib/assistant/llmClient.test.ts` — mock `@anthropic-ai/sdk`,
    test missing-key throw and trimmed-text-on-success.

---

## Tier 2 — Ship if time remains after Tier 1 is verified (real payoff, more surface area)

20b. **[Problem Statement Alignment]** `src/lib/assistant/rulesEngine.ts:382` — sort the
    assembled `insights` array by `estimatedImpactKg` (descending) before `.slice(0, 3)`,
    instead of relying on insertion order, so the README's "prioritized insights" claim is
    actually true. **Moved here from Tier 1 per advisor review**: `rulesEngine.ts` has already
    caused 3 subtle bugs in this project (see memory), and cold-start/onboarding insights —
    the single most judging-critical behavior in the app — may carry a low or zero
    `estimatedImpactKg` since they're nudges, not impact estimates. If they flow through this
    same `.slice(0,3)`, sorting by impact could demote the first-load onboarding message below
    the top-3 cutoff. **Before touching this line**: trace whether cold-start insights
    (lines ~27-227) reach line 382, and if so what `estimatedImpactKg` they carry. Write a test
    asserting the cold-start insight still appears in the top 3 post-sort, watch it pass against
    current (unsorted) behavior, only then add the sort and confirm the test still passes.
21. **[Problem Statement Alignment]** `rulesEngine.ts:256-259` — generalize the
    week-over-week trend heuristic from the two hardcoded subtypes (`car_solo`, `beef_meal`)
    to scan all subtypes per category for the largest increase. This is the strongest lever
    on the highest-weighted criterion but it's a real logic change — needs new/updated tests
    in `rulesEngine.test.ts` covering the generalized path before touching the function body
    (write the test first, watch it fail against current behavior, then implement).
22. **[Efficiency]** `src/components/dashboard/AssistantPanel.tsx:43-49` — debounce the
    fetch-on-every-entry-change effect (~500ms-1s after last change). Real cost/latency win
    (every log action currently fires a full POST, and an LLM call if a key is configured).
    Moderate risk: must preserve the existing `aria-live` loading-state UX.
23. **[Efficiency]** `rulesEngine.ts:334-357` — precompute per-category sums/counts once
    (O(n)) before the spike-detection loop instead of re-filtering+re-reducing the full
    history per entry (currently O(n²)). Pair with a regression test asserting identical
    output on the existing fixture data before/after.
24. **[Security]** `src/lib/utils/validation.ts:13,15` — constrain `subtype`/`unit` to an
    allow-list enum matching the UI's actual dropdown values, closing the free-text
    injection surface at the source. Higher risk than Tier 1 items (touches the schema other
    code paths depend on) — only attempt with buffer time and full test re-run.
25. **[Testing]** `src/components/dashboard/AssistantPanel.test.tsx` — empty-state, error+retry,
    success-render cases (mock `fetch` + `next/navigation`, following the existing
    `ActionLogForm.test.tsx` pattern).
26. **[Accessibility]** Add a text/table alternative alongside the SVG trend chart in
    `TrendChart.tsx` for screen-reader users (medium effort — the only a11y item not purely
    additive-attribute).

---

## Explicitly skip (negative or unclear expected value given deadline-day risk)

- Refactoring `rulesEngine.ts`'s `generateInsights` into smaller named functions (real
  code-quality win, but `rulesEngine.ts` has already caused 3 subtle bugs in this project —
  see memory; a structural refactor on submission day is the wrong trade against a HIGH-impact
  but already-functioning criterion).
- Centralizing subtype/transport-mode label maps into a shared constants file (legitimate
  DRY fix, low payoff vs. the risk of missing one of the 3 call sites and breaking a dropdown).
- Making the "urban commuter" persona load-bearing in the scoring logic (e.g. weighting
  transport insights higher) — directionally the single highest-value Problem-Statement fix
  identified, but it changes which insights surface for real users/judges with no time left to
  observe behavior across realistic data; too risky same-day.
- Goal-setting / weekly-target feature — net new feature, out of scope for a same-day patch.
- Rate-limit IP-spoofing hardening (`route.ts:47`) — bounded blast radius (LLM cost only, no
  data risk), fix requires touching request-handling logic for marginal benefit.
- Adding `dynamic import`/code-splitting — no heavy dependencies found; would be solving a
  problem that doesn't exist in this codebase.
- Bumping the pinned Anthropic model ID — confirmed in a prior round that
  `ANTHROPIC_API_KEY` is unset in production, making this dead code in the judged demo.

---

## Execution order

0. **Resolve the pre-execution checklist above** — confirm attempts remaining and best-of vs.
   latest scoring before shipping anything. These two facts decide how wide Tier 1b/Tier 2
   should go.
1. Tier 1, items 1-7 (code quality + security; all single-file, single-expression edits).
2. Run full verification gate.
3. Tier 1, items 8-9 (accessibility focus-ring + contrast; mechanical class swaps).
4. Run full verification gate, commit (2 groups: code-quality+security, a11y), push, redeploy
   to Vercel, confirm the live URL still renders the dashboard/log/insights flow correctly.
5. **Resubmit** (uses one of the remaining attempts) to test whether the scoring-update
   mechanism is commit-triggered or resubmission-triggered, and whether this batch moved the
   score at all.
6. If time and attempts remain: Tier 1b items, each as its own small commit, re-verify after
   each.
7. If time and attempts remain: Tier 2, in the listed order (20b first, with its test-first
   safeguard), each followed by its own verification gate and commit — don't batch Tier 2 items
   together, they're the riskier ones.

---

## Round 3 — what was actually shipped (supersedes everything above)

**Decision context:** advisor diagnosis (given AI-based judging, 2 submissions both at
95.91 with `2271285`'s Security/Testing changes confirmed *evaluated* and score-neutral,
1 irreversible latest-only attempt remaining) was that broad changes to already-saturated
MEDIUM/LOW criteria are negative-EV on the final attempt — regression risk with no proven
upside. The one lever that's both high-value (HIGH-weight Problem Statement Alignment) and
low-risk is README↔code coherence, since an AI judge reads the README narrative against the
actual code. User chose: README coherence + one HIGH-weight logic change (not the full
Tier 1/1b/2 batch above).

**Shipped:**
1. **[Problem Statement Alignment, HIGH]** `src/lib/assistant/rulesEngine.ts:382` — sort
   `insights` by `estimatedImpactKg` descending before `.slice(0, 3)`, making the README's
   "returns prioritized, typed insights" claim (line 13) actually true. **Test-first**: traced
   that cold-start insights (lines 27-230) return early at line 229 via a *separate*
   `.slice(0, 2)` and never reach line 382 — so the original safeguard concern (sorting
   demotes the first-load onboarding insight) doesn't apply here. Added a new test in
   `rulesEngine.test.ts` asserting descending-impact ordering across two simultaneously-firing
   heuristics (`spike_*` vs `habit_red_meat`), confirmed it failed against the unsorted
   baseline (28 tests, 1 failing), then added the one-line sort and confirmed all 28 pass.
2. **[README coherence check]** Re-read `README.md` against current code for the other two
   candidate overstated claims the prior review round flagged: the LLM-rephrase fallback
   description (line 14) and the persona/category scope (lines 5-7). Both already accurately
   describe current behavior (key-present/fail-closed wiring confirmed in `route.ts:71` and
   `llmClient.ts:10`) — no prose edit needed. The "prioritized insights" claim is now true by
   fix #1 rather than softened by rewrite, which was the safer of the two ways to close that
   gap.

**Verified:** `pnpm test` (28/28 passing), `pnpm lint` (clean), `pnpm typecheck` (clean),
`pnpm build` (clean production build, all 5 routes generated).

**Not shipped, deliberately:** the broad Tier 1/1b/2 batch above (Security headers, a11y
contrast/focus-ring fixes, additional test files, AssistantPanel debounce, etc.) — per the
advisor's diagnosis, these target criteria already proven saturated (`2271285` covered
Security/Testing and moved nothing).

## Round 4 — user accepted regression risk to spend the final attempt for upside

User's reasoning: rank 316 has no practical value, leaderboard #1 is 97.2 (only 1.29 points
above the banked 95.91) — worth spending the last attempt chasing that headroom. Advisor's
calibration: a flawless execution might bump the score a little; it might not move it at all —
don't expect a leap to #1. The risk call changes regression cost (now acceptable), not whether
MEDIUM/LOW-tier changes work (still proven inert by `2271285`) — so scope stayed confined to
the two HIGH-weight criteria (Problem Statement Alignment, Code Quality), not "change
everything."

**Shipped:**
3. **[Problem Statement Alignment + Code Quality, HIGH]**
   `src/lib/assistant/rulesEngine.ts` — generalized the week-over-week trend heuristic
   (previously hardcoded to exactly `car_solo` and `beef_meal`) to scan every
   category/subtype pair actually present in the user's history, picking whichever rising
   pair carries the largest estimated CO2e impact. **Test-first**: added a new test using a
   `chicken_meal` increase (a subtype the old hardcoded candidate list couldn't see), confirmed
   it failed (29 tests, 1 failing) against the unmodified two-candidate loop, implemented the
   generalized scan, confirmed all 29 pass. Updated the two pre-existing trend tests' insight-id
   assertions (`trend_solo_car` → `trend_transport_car_solo`) since the id format itself
   changed as an intended consequence of generalizing — not a silent behavior change hidden
   under a relabeled test.
4. **[Code Quality, HIGH]** `src/components/log/ActionLogForm.tsx` — removed a duplicate
   inline Zod schema that mirrored `logEntrySchema` in `src/lib/utils/validation.ts` field-for-
   field; the form now imports the canonical schema (`.omit({ id: true })`, since `id` is
   generated client-side after validation) instead of maintaining a second copy that could
   silently drift out of sync with the validated-on-submit schema.
5. **[README coherence]** Updated the rules-engine description to reflect the generalized
   trend scan and the impact-based sort, replacing the now-outdated "solo car trips" example
   framing with language matching the actual generalized behavior.

**Verified:** `pnpm test` (29/29), `pnpm lint` (clean), `pnpm typecheck` (clean), `pnpm build`
(clean production build). Also curled `/`, `/log`, `/insights` against a running local server —
all 200.

**Not shipped:** the advisor's other two speculative Code Quality suggestions (magic numbers in
`insights/page.tsx`, a duplicated ternary in `TrendChart.tsx`) — not verified as real issues in
this codebase before the time budget ran out; chasing unverified findings on the irreversible
attempt was the wrong trade.

**Next action (user's, not mine):** commit
(`src/lib/assistant/rulesEngine.ts`, `src/lib/assistant/rulesEngine.test.ts`,
`src/components/log/ActionLogForm.tsx`, `README.md`), push, redeploy, eyeball the live deploy,
then decide when to spend the final submission attempt.
