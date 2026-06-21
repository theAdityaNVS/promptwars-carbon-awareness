import { describe, it, expect } from 'vitest'
import { calculateEntryFootprint, aggregateByPeriod, compareToBaseline } from './calculate'
import { LogEntry, UserBaseline } from '@/types'

describe('Carbon Footprint Calculation Core', () => {
  describe('calculateEntryFootprint', () => {
    it('should correctly calculate transport emission for solo car driving', () => {
      const entry: LogEntry = {
        id: '1',
        date: '2026-06-21',
        category: 'transport',
        subtype: 'car_solo',
        quantity: 10,
        unit: 'km',
      }
      expect(calculateEntryFootprint(entry)).toBeCloseTo(1.92, 2) // 10 * 0.192
    })

    it('should return 0 for active transport like biking', () => {
      const entry: LogEntry = {
        id: '2',
        date: '2026-06-21',
        category: 'transport',
        subtype: 'bike',
        quantity: 5,
        unit: 'km',
      }
      expect(calculateEntryFootprint(entry)).toBe(0)
    })

    it('should correctly calculate diet footprint for a beef meal', () => {
      const entry: LogEntry = {
        id: '3',
        date: '2026-06-21',
        category: 'diet',
        subtype: 'beef_meal',
        quantity: 2,
        unit: 'meal',
      }
      expect(calculateEntryFootprint(entry)).toBe(12.0) // 2 * 6.0
    })
  })

  describe('aggregateByPeriod', () => {
    const sampleEntries: LogEntry[] = [
      { id: '1', date: '2026-06-18', category: 'transport', subtype: 'car_solo', quantity: 20, unit: 'km' }, // 3.84
      { id: '2', date: '2026-06-19', category: 'diet', subtype: 'beef_meal', quantity: 1, unit: 'meal' }, // 6.0
      { id: '3', date: '2026-06-20', category: 'energy', subtype: 'kwh_grid', quantity: 10, unit: 'kWh' }, // 4.5
    ]

    it('should sum all emissions when no date range is provided', () => {
      const res = aggregateByPeriod(sampleEntries)
      expect(res.total).toBeCloseTo(14.34, 2)
      expect(res.byCategory.transport).toBeCloseTo(3.84, 2)
      expect(res.byCategory.diet).toBeCloseTo(6.0, 2)
      expect(res.byCategory.energy).toBeCloseTo(4.5, 2)
    })

    it('should filter emissions out of date bounds', () => {
      const res = aggregateByPeriod(sampleEntries, { from: '2026-06-19', to: '2026-06-20' })
      expect(res.total).toBeCloseTo(10.5, 2) // 6.0 + 4.5
      expect(res.byCategory.transport).toBe(0)
    })
  })

  describe('compareToBaseline', () => {
    const asOf = new Date('2026-06-21T00:00:00.000Z')

    it('should be deterministic for the same inputs regardless of when it is called', () => {
      const entries: LogEntry[] = [
        { id: '1', date: '2026-06-20', category: 'transport', subtype: 'car_solo', quantity: 50, unit: 'km' },
      ]
      const baseline: UserBaseline = {
        commuteMode: 'car_solo',
        commuteKmPerWeek: 100, // baseline transport = 100 * 0.192 = 19.2 kg
        dietPattern: 'low_meat',
        kwhPerWeek: 50,
      }

      const resultA = compareToBaseline(entries, baseline, asOf)
      const resultB = compareToBaseline(entries, baseline, asOf)
      expect(resultA).toEqual(resultB)
    })

    it('should compute a normal nonzero-baseline percent deviation for transport', () => {
      const entries: LogEntry[] = [
        // 50 km solo car within the last 7 days -> 50 * 0.192 = 9.6 kg
        { id: '1', date: '2026-06-20', category: 'transport', subtype: 'car_solo', quantity: 50, unit: 'km' },
      ]
      const baseline: UserBaseline = {
        commuteMode: 'car_solo',
        commuteKmPerWeek: 100, // baseline transport = 100 * 0.192 = 19.2 kg
        dietPattern: 'low_meat',
        kwhPerWeek: 50,
      }

      const result = compareToBaseline(entries, baseline, asOf)
      const transport = result.find((r) => r.category === 'transport')

      // (9.6 - 19.2) / 19.2 * 100 = -50%
      expect(transport?.deltaPercent).toBeCloseTo(-50, 1)
    })

    it('should return null deltaPercent when baseline is zero and actual usage is nonzero', () => {
      const entries: LogEntry[] = [
        // Logged a solo car trip even though the user's baseline commute mode is biking (zero factor)
        { id: '1', date: '2026-06-20', category: 'transport', subtype: 'car_solo', quantity: 10, unit: 'km' },
      ]
      const baseline: UserBaseline = {
        commuteMode: 'bike', // baseline transport = commuteKmPerWeek * 0 = 0
        commuteKmPerWeek: 50,
        dietPattern: 'low_meat',
        kwhPerWeek: 50,
      }

      const result = compareToBaseline(entries, baseline, asOf)
      const transport = result.find((r) => r.category === 'transport')

      expect(transport?.deltaPercent).toBeNull()
    })

    it('should return 0 deltaPercent when both baseline and actual are zero', () => {
      const entries: LogEntry[] = []
      const baseline: UserBaseline = {
        commuteMode: 'car_solo',
        commuteKmPerWeek: 100,
        dietPattern: 'low_meat',
        kwhPerWeek: 0, // baseline energy = 0
      }

      const result = compareToBaseline(entries, baseline, asOf)
      const energy = result.find((r) => r.category === 'energy')

      expect(energy?.deltaPercent).toBe(0)
    })

    it('should compute a normal nonzero-baseline percent deviation for energy', () => {
      const entries: LogEntry[] = [
        // 20 kWh within the last 7 days -> 20 * 0.45 = 9.0 kg
        { id: '1', date: '2026-06-19', category: 'energy', subtype: 'kwh_grid', quantity: 20, unit: 'kWh' },
      ]
      const baseline: UserBaseline = {
        commuteMode: 'car_solo',
        commuteKmPerWeek: 100,
        dietPattern: 'low_meat',
        kwhPerWeek: 50, // baseline energy = 50 * 0.45 = 22.5 kg
      }

      const result = compareToBaseline(entries, baseline, asOf)
      const energy = result.find((r) => r.category === 'energy')

      // (9.0 - 22.5) / 22.5 * 100 = -60%
      expect(energy?.deltaPercent).toBeCloseTo(-60, 1)
    })
  })
})
