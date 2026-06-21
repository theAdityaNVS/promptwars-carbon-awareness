import { LogEntry, UserBaseline, Insight, Category } from '@/types'
import { EMISSION_FACTORS, AVERAGE_COMMUTER_BENCHMARKS } from '../carbon/factors'
import { calculateEntryFootprint } from '../carbon/calculate'

/**
 * Evaluates a user's logged history and baseline configurations to return
 * a list of targeted, context-aware carbon reduction insights.
 */
export function generateInsights(
  history: LogEntry[],
  baseline: UserBaseline | null
): Insight[] {
  const insights: Insight[] = []

  // Ensure we sort history by date ascending for sequential checks
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const todayStr = new Date().toISOString().split('T')[0]

  // --- HEURISTIC 0: Cold-Start Fallbacks (Fires when history is thin, < 3 entries) ---
  // Per spec: "treats userBaseline and the benchmark table as fallback context whenever
  // real history is thin, so insights fire from entry #1." This branch MUST always
  // produce at least one insight — either a corrective tip (above benchmark) or an
  // affirming "you're already doing great" insight (below all benchmarks).
  if (sortedHistory.length < 3) {
    if (baseline) {
      // Compare baseline commute against standard benchmark
      const weeklyCommuteEmissions =
        baseline.commuteKmPerWeek * (EMISSION_FACTORS[baseline.commuteMode] ?? 0)
      const benchmarkCommuteWeekly =
        AVERAGE_COMMUTER_BENCHMARKS.weekly_km * EMISSION_FACTORS.car_solo // benchmark target is solo driving

      if (weeklyCommuteEmissions > benchmarkCommuteWeekly) {
        const diff = weeklyCommuteEmissions - benchmarkCommuteWeekly
        insights.push({
          id: 'cold_commute',
          category: 'transport',
          severity: 'info',
          message: `Your baseline commute footprint is ${diff.toFixed(1)} kg CO2e above average. Consider replacing some trips with public transit or carpooling.`,
          estimatedImpactKg: Math.round(diff * 0.4 * 10) / 10, // 40% reduction target
          relatedAction: {
            category: 'transport',
            subtype: 'bus',
            quantity: Math.round(baseline.commuteKmPerWeek / 5),
            unit: 'km',
            description: 'Took transit for one fifth of my weekly commute',
          },
        })
      }

      // Compare baseline energy against standard benchmark
      if (baseline.kwhPerWeek > AVERAGE_COMMUTER_BENCHMARKS.weekly_kwh) {
        const diff = (baseline.kwhPerWeek - AVERAGE_COMMUTER_BENCHMARKS.weekly_kwh) * EMISSION_FACTORS.kwh_grid
        insights.push({
          id: 'cold_energy',
          category: 'energy',
          severity: 'tip',
          message: `Your home energy usage is higher than the typical commuter average. Swapping to energy-efficient appliances or reducing cooling could save CO2e.`,
          estimatedImpactKg: Math.round(diff * 10) / 10,
          relatedAction: {
            category: 'energy',
            subtype: 'kwh_grid',
            quantity: 5,
            unit: 'kWh',
            description: 'Reduced home heating/cooling usage',
          },
        })
      }

      // Compare baseline diet
      if (baseline.dietPattern === 'high_meat') {
        insights.push({
          id: 'cold_diet',
          category: 'diet',
          severity: 'tip',
          message: 'High-meat diets contribute heavily to personal emissions. Replacing just one beef meal with a plant-based option this week can make a big difference.',
          estimatedImpactKg: EMISSION_FACTORS.beef_meal - EMISSION_FACTORS.vegetarian_meal,
          relatedAction: {
            category: 'diet',
            subtype: 'vegetarian_meal',
            quantity: 1,
            unit: 'meal',
            description: 'Substituted a beef meal for a vegetarian option',
          },
        })
      }

      // Finding #1 fix: if every metric is already below benchmark, none of the
      // corrective branches above will have fired. Guarantee a real insight by
      // affirming the strongest "below average" margin instead of returning [].
      if (insights.length === 0) {
        const commuteSavingsKg = benchmarkCommuteWeekly - weeklyCommuteEmissions
        const benchmarkEnergyWeekly = AVERAGE_COMMUTER_BENCHMARKS.weekly_kwh * EMISSION_FACTORS.kwh_grid
        const actualEnergyWeekly = baseline.kwhPerWeek * EMISSION_FACTORS.kwh_grid
        const energySavingsKg = benchmarkEnergyWeekly - actualEnergyWeekly

        // Pick whichever category shows the larger absolute savings to highlight.
        if (commuteSavingsKg >= energySavingsKg) {
          const percentBelow = benchmarkCommuteWeekly > 0
            ? Math.round((commuteSavingsKg / benchmarkCommuteWeekly) * 100)
            : 0
          insights.push({
            id: 'cold_affirm_commute',
            category: 'transport',
            severity: 'info',
            message: `Nice work — your commute footprint is ${percentBelow}% below the average commuter (saving about ${commuteSavingsKg.toFixed(1)} kg CO2e/week). Keep it up!`,
            estimatedImpactKg: Math.round(commuteSavingsKg * 10) / 10,
          })
        } else {
          const percentBelow = benchmarkEnergyWeekly > 0
            ? Math.round((energySavingsKg / benchmarkEnergyWeekly) * 100)
            : 0
          insights.push({
            id: 'cold_affirm_energy',
            category: 'energy',
            severity: 'info',
            message: `Nice work — your home energy usage is ${percentBelow}% below the average commuter benchmark (saving about ${energySavingsKg.toFixed(1)} kg CO2e/week). Keep it up!`,
            estimatedImpactKg: Math.round(energySavingsKg * 10) / 10,
          })
        }
      }
    } else if (sortedHistory.length === 0) {
      // Fresh start, no baseline, no history at all
      insights.push({
        id: 'cold_welcome',
        category: 'diet',
        severity: 'info',
        message: 'Welcome! Get started by setting up your baseline profile or logging your first action. Your assistant will analyze your progress and offer tips here.',
        estimatedImpactKg: 0,
      })
    } else {
      // Finding #2 fix: no baseline, but 1-2 real entries exist. Compare the most
      // recent entry directly against AVERAGE_COMMUTER_BENCHMARKS rather than
      // falling through to the generic welcome message.
      const latestEntry = sortedHistory[sortedHistory.length - 1]
      const entryFootprint = calculateEntryFootprint(latestEntry)

      if (latestEntry.category === 'transport') {
        // Benchmark is weekly; convert to a daily-equivalent so a single trip is
        // comparable to a single day's average commute (weekly_km / 7 days at the
        // benchmark's implied solo-car rate).
        const dailyBenchmarkKg = (AVERAGE_COMMUTER_BENCHMARKS.weekly_km / 7) * EMISSION_FACTORS.car_solo
        const diffPercent = dailyBenchmarkKg > 0
          ? Math.round(((entryFootprint - dailyBenchmarkKg) / dailyBenchmarkKg) * 100)
          : 0

        if (entryFootprint > dailyBenchmarkKg) {
          insights.push({
            id: 'cold_entry_commute',
            category: 'transport',
            severity: 'info',
            message: `Your ${latestEntry.quantity}${latestEntry.unit} ${latestEntry.subtype.replace('_', ' ')} trip is ${diffPercent}% above the average commuter's daily footprint.`,
            estimatedImpactKg: Math.round((entryFootprint - dailyBenchmarkKg) * 10) / 10,
            relatedAction: {
              category: 'transport',
              subtype: 'bus',
              quantity: latestEntry.quantity,
              unit: latestEntry.unit,
              description: 'Took transit instead of driving solo',
            },
          })
        } else {
          insights.push({
            id: 'cold_entry_commute_affirm',
            category: 'transport',
            severity: 'info',
            message: `Nice work — your ${latestEntry.quantity}${latestEntry.unit} ${latestEntry.subtype.replace('_', ' ')} trip is ${Math.abs(diffPercent)}% below the average commuter's daily footprint.`,
            estimatedImpactKg: Math.round((dailyBenchmarkKg - entryFootprint) * 10) / 10,
          })
        }
      } else if (latestEntry.category === 'diet') {
        const dailyBeefBenchmarkKg = (AVERAGE_COMMUTER_BENCHMARKS.weekly_beef / 7) * EMISSION_FACTORS.beef_meal
        if (entryFootprint > dailyBeefBenchmarkKg) {
          insights.push({
            id: 'cold_entry_diet',
            category: 'diet',
            severity: 'info',
            message: `Your logged ${latestEntry.subtype.replace('_', ' ')} has a higher footprint than the average commuter's typical daily diet emissions. Swapping in a plant-based meal can help.`,
            estimatedImpactKg: Math.round((entryFootprint - dailyBeefBenchmarkKg) * 10) / 10,
            relatedAction: {
              category: 'diet',
              subtype: 'vegetarian_meal',
              quantity: 1,
              unit: 'meal',
              description: 'Substituted a beef meal for a vegetarian option',
            },
          })
        } else {
          insights.push({
            id: 'cold_entry_diet_affirm',
            category: 'diet',
            severity: 'info',
            message: `Nice work — your logged ${latestEntry.subtype.replace('_', ' ')} keeps you below the average commuter's typical daily diet emissions.`,
            estimatedImpactKg: Math.round((dailyBeefBenchmarkKg - entryFootprint) * 10) / 10,
          })
        }
      } else {
        // energy
        const dailyEnergyBenchmarkKg = (AVERAGE_COMMUTER_BENCHMARKS.weekly_kwh / 7) * EMISSION_FACTORS.kwh_grid
        if (entryFootprint > dailyEnergyBenchmarkKg) {
          insights.push({
            id: 'cold_entry_energy',
            category: 'energy',
            severity: 'info',
            message: `Your logged energy usage is above the average commuter's typical daily home energy footprint.`,
            estimatedImpactKg: Math.round((entryFootprint - dailyEnergyBenchmarkKg) * 10) / 10,
            relatedAction: {
              category: 'energy',
              subtype: 'kwh_grid',
              quantity: 5,
              unit: 'kWh',
              description: 'Reduced home heating/cooling usage',
            },
          })
        } else {
          insights.push({
            id: 'cold_entry_energy_affirm',
            category: 'energy',
            severity: 'info',
            message: `Nice work — your logged energy usage is below the average commuter's typical daily home energy footprint.`,
            estimatedImpactKg: Math.round((dailyEnergyBenchmarkKg - entryFootprint) * 10) / 10,
          })
        }
      }
    }

    return insights.slice(0, 2) // Return top 2 cold start tips
  }

  // --- HEURISTIC 1 (trend): Week-over-week per-category comparison (needs >= 2 weeks of history) ---
  // Spec: "this-week vs last-week per category, e.g. '3+ solo car trips this week vs
  // last week -> suggest carpooling/transit.'" Gated on the earliest entry being at
  // least 14 days old, since comparing two windows is meaningless without 2 full weeks.
  const earliestEntry = sortedHistory[0]
  const earliestDaysAgo = earliestEntry
    ? (new Date(todayStr).getTime() - new Date(earliestEntry.date).getTime()) / (1000 * 3600 * 24)
    : 0

  if (earliestDaysAgo >= 14) {
    const thisWeek = sortedHistory.filter((e) => {
      const daysDiff = (new Date(todayStr).getTime() - new Date(e.date).getTime()) / (1000 * 3600 * 24)
      return daysDiff >= 0 && daysDiff < 7
    })
    const lastWeek = sortedHistory.filter((e) => {
      const daysDiff = (new Date(todayStr).getTime() - new Date(e.date).getTime()) / (1000 * 3600 * 24)
      return daysDiff >= 7 && daysDiff < 14
    })

    // Spec's own example is solo car trips, but the persona logs across transport,
    // diet, and energy — so scan every (category, subtype) pair actually present in
    // history rather than hardcoding just car_solo/beef_meal, and surface whichever
    // rising pair carries the largest estimated impact.
    const countBySubtype = (entries: LogEntry[], category: Category, subtype: string) =>
      entries.filter((e) => e.category === category && e.subtype === subtype).length

    const observedPairs = Array.from(
      new Set(sortedHistory.map((e) => `${e.category} ${e.subtype}`))
    ).map((key) => {
      const [category, subtype] = key.split(' ') as [Category, string]
      return { category, subtype }
    })

    let bestTrend: {
      category: Category
      subtype: string
      thisWeekCount: number
      lastWeekCount: number
      impactKg: number
    } | null = null

    for (const { category, subtype } of observedPairs) {
      const thisWeekEntries = thisWeek.filter((e) => e.category === category && e.subtype === subtype)
      const thisWeekCount = thisWeekEntries.length
      const lastWeekCount = countBySubtype(lastWeek, category, subtype)

      // "Meaningful increase": at least 3 occurrences this week (mirrors the spec's
      // "3+ solo car trips" example) AND an increase of at least 1 over last week.
      if (thisWeekCount < 3 || thisWeekCount <= lastWeekCount) continue

      const extraOccurrences = thisWeekCount - lastWeekCount
      const avgFootprintKg =
        thisWeekEntries.reduce((acc, e) => acc + calculateEntryFootprint(e), 0) / thisWeekCount
      const impactKg = avgFootprintKg * extraOccurrences

      if (!bestTrend || impactKg > bestTrend.impactKg) {
        bestTrend = { category, subtype, thisWeekCount, lastWeekCount, impactKg }
      }
    }

    if (bestTrend) {
      const { category, subtype, thisWeekCount, lastWeekCount, impactKg } = bestTrend
      const subtypeLabel = subtype.replace(/_/g, ' ')
      const relatedAction =
        category === 'transport'
          ? { category: 'transport' as const, subtype: 'car_shared', quantity: 1, unit: 'km', description: 'Carpooled instead of driving solo' }
          : category === 'diet'
            ? { category: 'diet' as const, subtype: 'vegetarian_meal', quantity: 1, unit: 'meal', description: 'Substituted a plant-based meal' }
            : { category: 'energy' as const, subtype: 'kwh_grid', quantity: 5, unit: 'kWh', description: 'Reduced home energy usage' }

      insights.push({
        id: `trend_${category}_${subtype}`,
        category,
        severity: 'warning',
        message: `You've logged ${thisWeekCount} ${subtypeLabel} entries this week, up from ${lastWeekCount} last week. That trend is adding up — consider cutting back.`,
        estimatedImpactKg: Math.round(impactKg * 10) / 10,
        relatedAction,
      })
    }
  }

  // --- HEURISTIC 2: Frequency / Diet Habits ---
  const dietEntries = sortedHistory.filter((e) => e.category === 'diet')
  const beefMealsThisWeek = dietEntries.filter((e) => {
    const daysDiff = (new Date(todayStr).getTime() - new Date(e.date).getTime()) / (1000 * 3600 * 24)
    return daysDiff <= 7 && e.subtype === 'beef_meal'
  })

  if (beefMealsThisWeek.length > AVERAGE_COMMUTER_BENCHMARKS.weekly_beef) {
    insights.push({
      id: 'habit_red_meat',
      category: 'diet',
      severity: 'tip',
      message: `You logged ${beefMealsThisWeek.length} red-meat meals this week, exceeding average commuter benchmarks. Swap one beef dinner for chicken or a vegetarian meal.`,
      estimatedImpactKg: EMISSION_FACTORS.beef_meal - EMISSION_FACTORS.vegetarian_meal,
      relatedAction: {
        category: 'diet',
        subtype: 'vegetarian_meal',
        quantity: 1,
        unit: 'meal',
        description: 'Healthy plant-based dinner',
      },
    })
  }

  // --- HEURISTIC 3: Spike Detection (1 single action exceeds 2x rolling category average) ---
  for (const entry of sortedHistory) {
    // Only check recent entries (last 3 days)
    const daysDiff = (new Date(todayStr).getTime() - new Date(entry.date).getTime()) / (1000 * 3600 * 24)
    if (daysDiff > 3) continue

    const categoryEntries = sortedHistory.filter(
      (e) => e.category === entry.category && e.id !== entry.id
    )
    if (categoryEntries.length < 3) continue

    const sum = categoryEntries.reduce((acc, curr) => acc + calculateEntryFootprint(curr), 0)
    const average = sum / categoryEntries.length
    const currentFootprint = calculateEntryFootprint(entry)

    if (currentFootprint > average * 2) {
      insights.push({
        id: `spike_${entry.id}`,
        category: entry.category,
        severity: 'warning',
        message: `Your logged ${entry.category} action on ${entry.date} (${currentFootprint.toFixed(1)} kg) was more than double your average activity level. Check for reduction options.`,
        estimatedImpactKg: Math.round((currentFootprint - average) * 0.5 * 10) / 10, // Target reducing the spike by 50%
      })
      break // Only flag one spike at a time
    }
  }

  // Fallback: general sustainablity tips if no other heuristics triggered
  if (insights.length === 0) {
    // estimatedImpactKg = avoided emissions of the suggested action (walking 1.5 km)
    // versus driving that same distance solo, derived from EMISSION_FACTORS rather
    // than a hardcoded constant.
    const walkVsSoloCarImpactKg = 1.5 * EMISSION_FACTORS.car_solo
    insights.push({
      id: 'general_eco',
      category: 'energy',
      severity: 'info',
      message: 'Great job maintaining your logs! Small actions like turning off unused electronics, walking for trips under 2 km, and air-drying laundry keep your emissions low.',
      estimatedImpactKg: Math.round(walkVsSoloCarImpactKg * 10) / 10,
      relatedAction: {
        category: 'transport',
        subtype: 'walk',
        quantity: 1.5,
        unit: 'km',
        description: 'Walked to run a quick errand',
      },
    })
  }

  // Prioritize by estimated impact so the highest-value insight surfaces first.
  return insights.sort((a, b) => b.estimatedImpactKg - a.estimatedImpactKg).slice(0, 3)
}
