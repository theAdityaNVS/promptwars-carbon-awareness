import Anthropic from '@anthropic-ai/sdk'
import { REPHRASE_SYSTEM_PROMPT } from './prompt'
import { Insight } from '@/types'

/**
 * Rephrases a given rule-based carbon footprint insight using the Anthropic API.
 * Pinned to 'claude-3-5-haiku-20241022' to remain lightweight, efficient, and cost-effective.
 */
export async function rephraseInsight(insight: Insight): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Anthropic API key not configured.')
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 150,
    system: REPHRASE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Insight message to rephrase: "${insight.message}"`,
      },
    ],
  })

  const block = response.content[0]
  if (block && block.type === 'text') {
    return block.text.trim()
  }

  throw new Error('No text returned from Anthropic.')
}
