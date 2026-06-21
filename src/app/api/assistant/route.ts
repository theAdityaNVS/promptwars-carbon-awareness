import { NextResponse, NextRequest } from 'next/server'
import { generateInsights } from '@/lib/assistant/rulesEngine'
import { rephraseInsight } from '@/lib/assistant/llmClient'
import { assistantRequestSchema } from '@/lib/utils/validation'

// In-memory rate limiter store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false
  }

  record.count += 1
  return true
}

export async function POST(request: NextRequest) {
  // Retrieve request IP or fallback
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  // 1. Rate Limiting Check
  if (!checkRateLimit(ip)) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  try {
    const body = await request.json()

    // 2. Validate request body
    const validation = assistantRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { entries, baseline } = validation.data

    // 3. Generate insights from rules engine
    const insights = generateInsights(entries, baseline)

    // 4. Try rephrasing top insight if API key is set
    let source: 'rules' | 'rules+llm' = 'rules'
    
    if (process.env.ANTHROPIC_API_KEY && insights.length > 0 && insights[0].estimatedImpactKg > 0) {
      try {
        const topInsight = insights[0]

        // Wrap rephrase in a 4s timeout to prevent hanging serverless functions
        const rephrasePromise = rephraseInsight(topInsight)
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Anthropic API Timeout')), 4000)
        )

        const rephrasedMessage = await Promise.race([rephrasePromise, timeoutPromise])
        insights[0].message = rephrasedMessage
        source = 'rules+llm'
      } catch (err) {
        console.warn('AI rephrase failed; falling back to rule-based output:', err)
        // Fallback: leave message as rules-based string, source stays 'rules'
      }
    }

    return NextResponse.json({ insights, source })
  } catch (err) {
    console.error('Error in assistant API:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
