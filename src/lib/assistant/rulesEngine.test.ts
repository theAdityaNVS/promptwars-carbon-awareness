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

  it('should still produce an affirming insight when a baseline is entirely below all benchmarks (finding #1)', () => {
    const greenBaseline: UserBaseline = {
      commuteMode: 'bike',
      commuteKmPerWeek: 10,
      dietPattern: 'veg',
      kwhPerWeek: 5,
    }
    const insights = generateInsights([], greenBaseline)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0].id.startsWith('cold_affirm')).toBe(true)
    expect(insights[0].estimatedImpactKg).toBeGreaterThan(0)
  })

  it('should compare a single entry against AVERAGE_COMMUTER_BENCHMARKS when no baseline exists but history is thin (finding #2)', () => {
    const history: LogEntry[] = [
      {
        id: 'e1',
        date: new Date().toISOString().split('T')[0],
        category: 'transport',
        subtype: 'car_solo',
        quantity: 80, // well above the daily-equivalent benchmark
        unit: 'km',
      },
    ]

    const insights = generateInsights(history, null)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0].id).toBe('cold_entry_commute')
    expect(insights[0].message).toMatch(/average commuter/i)
    expect(insights[0].estimatedImpactKg).toBeGreaterThan(0)
  })

  it('should fire a week-over-week trend insight when this-week solo car trips increase vs last week (finding #3)', () => {
    const today = new Date()
    const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 3600 * 1000).toISOString().split('T')[0]

    const history: LogEntry[] = [
      // Earliest entry >= 14 days old so the trend gate is satisfied
      { id: 'old0', date: daysAgo(15), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      // Last week (8-14 days ago): 1 solo car trip
      { id: 'lw1', date: daysAgo(10), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      // This week (0-6 days ago): 3 solo car trips (increase vs last week's 1)
      { id: 'tw1', date: daysAgo(1), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      { id: 'tw2', date: daysAgo(2), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      { id: 'tw3', date: daysAgo(3), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
    ]

    const insights = generateInsights(history, null)
    expect(insights.some((i) => i.id === 'trend_solo_car')).toBe(true)
    const trendInsight = insights.find((i) => i.id === 'trend_solo_car')
    expect(trendInsight?.estimatedImpactKg).toBeGreaterThan(0)
    // Message must reflect an actual week-over-week comparison, not just a raw
    // single-window count (which is what the old buggy implementation produced).
    expect(trendInsight?.message).toMatch(/up from 1 last week/i)
  })

  it('should NOT fire the trend insight when this-week count is flat or down vs last week, even if >= 3 (finding #3 regression guard)', () => {
    const today = new Date()
    const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 3600 * 1000).toISOString().split('T')[0]

    const history: LogEntry[] = [
      { id: 'old0', date: daysAgo(15), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      // Last week (8-14 days ago): 3 solo car trips
      { id: 'lw1', date: daysAgo(8), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      { id: 'lw2', date: daysAgo(9), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      { id: 'lw3', date: daysAgo(10), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      // This week (0-6 days ago): also 3 solo car trips — same count, no increase
      { id: 'tw1', date: daysAgo(1), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      { id: 'tw2', date: daysAgo(2), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      { id: 'tw3', date: daysAgo(3), category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
    ]

    const insights = generateInsights(history, null)
    // The old single-window implementation would have fired here (count >= 3 in
    // the last 7 days), but the week-over-week fix should not, since there was
    // no increase versus the prior week.
    expect(insights.every((i) => i.id !== 'trend_solo_car')).toBe(true)
  })
})
