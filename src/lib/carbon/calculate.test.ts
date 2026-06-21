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
})
