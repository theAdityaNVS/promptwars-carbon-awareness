import { LogEntry, Category, UserBaseline } from '@/types'
import { EMISSION_FACTORS } from './factors'

/**
 * Calculates the CO2e footprint for a single log entry in kg.
 */
export function calculateEntryFootprint(entry: LogEntry): number {
  const subtype = entry.subtype as keyof typeof EMISSION_FACTORS
  const factor = EMISSION_FACTORS[subtype] ?? 0
  return entry.quantity * factor
}

/**
 * Aggregates emissions for a given set of log entries within an optional date range.
 * Returns the total CO2e in kg and a category-wise breakdown.
 */
export function aggregateByPeriod(
  entries: LogEntry[],
  range?: { from: string; to: string }
): { total: number; byCategory: Record<Category, number> } {
  const result = {
    total: 0,
    byCategory: {
      transport: 0,
      diet: 0,
      energy: 0,
    },
  }

  const fromDate = range?.from ? new Date(range.from) : null
  const toDate = range?.to ? new Date(range.to) : null

  for (const entry of entries) {
    if (fromDate || toDate) {
      const entryDate = new Date(entry.date)
      if (fromDate && entryDate < fromDate) continue
      if (toDate && entryDate > toDate) continue
    }

    const footprint = calculateEntryFootprint(entry)
    result.total += footprint
    result.byCategory[entry.category] += footprint
  }

  // Round numbers to 2 decimal places to prevent floating point representation issues
  result.total = Math.round(result.total * 100) / 100
  result.byCategory.transport = Math.round(result.byCategory.transport * 100) / 100
  result.byCategory.diet = Math.round(result.byCategory.diet * 100) / 100
  result.byCategory.energy = Math.round(result.byCategory.energy * 100) / 100

  return result
}

/**
 * Compares actual weekly emissions (the 7 days ending at `asOf`, inclusive)
 * against a user's baseline. Returns percent deviations for each category.
 *
 * `asOf` is supplied by the caller so this function stays pure / deterministic
 * (no internal `new Date()`).
 */
export function compareToBaseline(
  entries: LogEntry[],
  baseline: UserBaseline,
  asOf: Date
): { deltaPercent: number | null; category: Category }[] {
  // Aggregate emissions for the 7 days ending at asOf (inclusive)
  const sevenDaysAgo = new Date(asOf)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const range = {
    from: sevenDaysAgo.toISOString().split('T')[0],
    to: asOf.toISOString().split('T')[0],
  }

  const { byCategory } = aggregateByPeriod(entries, range)

  // Calculate baseline weekly emissions in kg CO2e
  const baselineTransport = baseline.commuteKmPerWeek * (EMISSION_FACTORS[baseline.commuteMode] ?? 0)
  
  // Estimate baseline diet: map user patterns to rough meal distributions
  // high_meat -> ~4 beef meals, ~5 chicken meals, ~12 veg meals
  // low_meat -> ~1 beef meal, ~4 chicken meals, ~16 veg meals
  // veg -> ~21 veg meals
  let dietBeefCount = 2
  let dietChickenCount = 3
  let dietVegCount = 16

  if (baseline.dietPattern === 'high_meat') {
    dietBeefCount = 5
    dietChickenCount = 5
    dietVegCount = 11
  } else if (baseline.dietPattern === 'low_meat') {
    dietBeefCount = 1
    dietChickenCount = 4
    dietVegCount = 16
  } else if (baseline.dietPattern === 'veg') {
    dietBeefCount = 0
    dietChickenCount = 0
    dietVegCount = 21
  }

  const baselineDiet = 
    dietBeefCount * EMISSION_FACTORS.beef_meal +
    dietChickenCount * EMISSION_FACTORS.chicken_meal +
    dietVegCount * EMISSION_FACTORS.vegetarian_meal

  const baselineEnergy = baseline.kwhPerWeek * EMISSION_FACTORS.kwh_grid

  const baselines: Record<Category, number> = {
    transport: baselineTransport,
    diet: baselineDiet,
    energy: baselineEnergy,
  }

  return (['transport', 'diet', 'energy'] as Category[]).map((category) => {
    const actual = byCategory[category]
    const base = baselines[category]

    let deltaPercent: number | null
    if (base === 0) {
      // Zero baseline: a finite percent deviation is meaningless.
      // No usage against no baseline is "no change"; any usage against
      // a true-zero baseline is an unbounded ("infinite") increase.
      deltaPercent = actual === 0 ? 0 : null
    } else {
      deltaPercent = Math.round(((actual - base) / base) * 100 * 10) / 10
    }

    return {
      category,
      deltaPercent,
    }
  })
}
