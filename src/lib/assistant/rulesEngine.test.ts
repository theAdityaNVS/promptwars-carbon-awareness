import { describe, it, expect } from 'vitest'
import { generateInsights } from './rulesEngine'
import { LogEntry, UserBaseline } from '@/types'

describe('Carbon Assistant Rules Engine', () => {
  it('should trigger cold welcome when no history and no baseline exists', () => {
    const insights = generateInsights([], null)
    expect(insights).toHaveLength(1)
    expect(insights[0].id).toBe('cold_welcome')
  })

  it('should trigger cold commute warning when baseline commute exceeds benchmark', () => {
    const baseline: UserBaseline = {
      commuteMode: 'car_solo',
      commuteKmPerWeek: 300, // Very high commute
      dietPattern: 'high_meat',
      kwhPerWeek: 30,
    }
    const insights = generateInsights([], baseline)
    expect(insights).toHaveLength(2)
    expect(insights.some((i) => i.id === 'cold_commute')).toBe(true)
  })

  it('should trigger red meat warning when weekly count exceeds average benchmarks', () => {
    // Generate 6 days of beef meals
    const history: LogEntry[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `m${i}`,
      date: new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().split('T')[0],
      category: 'diet',
      subtype: 'beef_meal',
      quantity: 1,
      unit: 'meal',
    }))

    const insights = generateInsights(history, null)
    expect(insights.some((i) => i.id === 'habit_red_meat')).toBe(true)
  })
})
