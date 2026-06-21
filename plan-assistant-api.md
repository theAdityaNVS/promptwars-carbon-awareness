# Sub-Plan: Assistant API Layer

> Inherits Context and Tech Stack from [`plan-master.md`](./plan-master.md). Wraps the pure logic from [`plan-core-domain.md`](./plan-core-domain.md) in a serverless route consumed by `AssistantPanel` (see [`plan-frontend-ui.md`](./plan-frontend-ui.md)).

## Files

```
src/app/api/assistant/route.ts
src/lib/assistant/llmClient.ts
src/lib/assistant/prompt.ts
```

## Why this is its own sub-plan

This is the only server-side code in the app and the only place a secret (`ANTHROPIC_API_KEY`) or an abuse vector (public unauthenticated POST endpoint) can exist. It gets dedicated security treatment rather than being folded into the frontend plan.

## `app/api/assistant/route.ts`

```
POST /api/assistant
body: { entries: LogEntry[], baseline: UserBaseline | null }
```

Flow:
1. Parse body with `assistantRequestSchema` (Zod, from core-domain plan) — rejects malformed shape, oversized arrays, and any free-text field over its length cap. Invalid input → `400`, never reaches the rules engine or the LLM.
2. **Rate limiting**: an in-memory token-bucket keyed by request IP (e.g. 10 requests/minute/IP). This is a single-instance, best-effort guard — acceptable for a hackathon deploy, not a substitute for a real WAF, but it closes the obvious "free LLM proxy" abuse case. Exceeding the limit → `429`, no LLM call attempted.
3. Run `generateInsights(entries, baseline)` from the core domain layer. This is the guaranteed-to-work path.
4. **Only if** `process.env.ANTHROPIC_API_KEY` is set: call `llmClient.rephraseInsight(topInsight)` to turn the top insight into more conversational phrasing, using model `claude-haiku-4-5` (cheap rewrite task, not reasoning — no justification for a larger model here). Wrap in a timeout (e.g. 5s) and try/catch.
5. On missing key, timeout, API error, or rate-limit from Anthropic itself: return the raw rules-engine `Insight[]` unchanged with `source: 'rules'`. On successful rephrase: `source: 'rules+llm'`. The route **never** returns an error to the client for LLM-layer failures — only for the input-validation/rate-limit cases in steps 1-2.

## `lib/assistant/llmClient.ts`

Thin wrapper around `@anthropic-ai/sdk`, server-only (never imported by client components):

```ts
export async function rephraseInsight(insight: Insight): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 150,
    system: REPHRASE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: insight.message }],
  })
  return extractText(response)
}
```

## `lib/assistant/prompt.ts`

Holds `REPHRASE_SYSTEM_PROMPT` as a constant: instructs the model to rephrase the given rule-based insight into a friendly, concise (1-2 sentence) tip **without inventing new facts or numbers** — the rephrase is purely stylistic, the underlying `estimatedImpactKg` and category always come from the rules engine, never from the LLM. This is also a prompt-injection mitigation: the LLM is never given user-authored free text as an instruction, only a pre-validated, pre-computed insight message to restyle.

## Security checklist for this sub-plan specifically

- [ ] No API key ever appears in client-bundled code (verify: `grep -r ANTHROPIC` in `src/components` and `src/app/**/page.tsx` returns nothing).
- [ ] `.env.local` is gitignored; `.env.local.example` documents `ANTHROPIC_API_KEY=` with no real value.
- [ ] Request body size and array length are bounded by the Zod schema before any processing.
- [ ] Rate limiter rejects before the LLM call, not after.
- [ ] Route returns `200` with rules-only output even when the LLM call fails — verified by a manual test with an invalid key.

## Verification

- With no `ANTHROPIC_API_KEY` set: POST a valid body, confirm `200` with `source: 'rules'` and sensible insights.
- With a valid key set locally: confirm `source: 'rules+llm'` and the message reads more conversationally while the `estimatedImpactKg` number matches the rules-engine value exactly.
- Simulate failure (invalid key or unplug network): confirm graceful fallback to `source: 'rules'`, no `500`.
- Send >10 requests/minute from one client: confirm `429` kicks in.
- Send an oversized/malformed body: confirm `400` and no LLM call (check no Anthropic request was attempted via a log/breakpoint).
