import { describe, it, expect } from 'vitest'
import { logEntrySchema, userBaselineSchema, assistantRequestSchema } from './validation'

const validEntry = {
  id: 'e1',
  category: 'transport' as const,
  subtype: 'car_solo',
  quantity: 10,
  unit: 'km',
  date: '2026-01-01',
}

const validBaseline = {
  commuteMode: 'car_solo' as const,
  commuteKmPerWeek: 100,
  dietPattern: 'high_meat',
  kwhPerWeek: 30,
}

describe('logEntrySchema', () => {
  it('accepts a valid entry', () => {
    expect(logEntrySchema.safeParse(validEntry).success).toBe(true)
  })

  it('rejects an oversized subtype string', () => {
    const result = logEntrySchema.safeParse({ ...validEntry, subtype: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('rejects an oversized unit string', () => {
    const result = logEntrySchema.safeParse({ ...validEntry, unit: 'a'.repeat(21) })
    expect(result.success).toBe(false)
  })

  it('rejects an oversized description', () => {
    const result = logEntrySchema.safeParse({ ...validEntry, description: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })
})

describe('userBaselineSchema', () => {
  it('accepts a valid baseline', () => {
    expect(userBaselineSchema.safeParse(validBaseline).success).toBe(true)
  })

  it('rejects an oversized dietPattern string', () => {
    const result = userBaselineSchema.safeParse({ ...validBaseline, dietPattern: 'a'.repeat(31) })
    expect(result.success).toBe(false)
  })
})

describe('assistantRequestSchema', () => {
  it('rejects more than 150 entries', () => {
    const entries = Array.from({ length: 151 }, (_, i) => ({ ...validEntry, id: `e${i}` }))
    const result = assistantRequestSchema.safeParse({ entries, baseline: null })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 150 entries', () => {
    const entries = Array.from({ length: 150 }, (_, i) => ({ ...validEntry, id: `e${i}` }))
    const result = assistantRequestSchema.safeParse({ entries, baseline: null })
    expect(result.success).toBe(true)
  })
})
