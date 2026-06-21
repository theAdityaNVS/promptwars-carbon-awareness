import { LogEntry, UserBaseline, Insight } from '@/types'
import { EMISSION_FACTORS, AVERAGE_COMMUTER_BENCHMARKS } from '../carbon/factors'
import { calculateEntryFootprint, aggregateByPeriod } from '../carbon/calculate'

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

  // --- HEURISTIC 1: Cold-Start Fallbacks (Fires when history is thin, < 3 entries) ---
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
    } else {
      // Fresh start, no baseline, no history
      insights.push({
        id: 'cold_welcome',
        category: 'diet',
        severity: 'info',
        message: 'Welcome! Get started by setting up your baseline profile or logging your first action. Your assistant will analyze your progress and offer tips here.',
        estimatedImpactKg: 0,
      })
    }

    return insights.slice(0, 2) // Return top 2 cold start tips
  }

  // --- HEURISTIC 2: Trend Checks (Requires >= 5 entries) ---
  const transportEntries = sortedHistory.filter((e) => e.category === 'transport')
  const soloCarCommutesThisWeek = transportEntries.filter((e) => {
    const daysDiff = (new Date(todayStr).getTime() - new Date(e.date).getTime()) / (1000 * 3600 * 24)
    return daysDiff <= 7 && e.subtype === 'car_solo'
  })

  if (soloCarCommutesThisWeek.length >= 3) {
    const totalKm = soloCarCommutesThisWeek.reduce((acc, curr) => acc + curr.quantity, 0)
    // Suggest taking transit or biking
    insights.push({
      id: 'trend_solo_car',
      category: 'transport',
      severity: 'warning',
      message: `You've logged ${soloCarCommutesThisWeek.length} solo car trips in the last week totaling ${totalKm} km. Switching some to carpools or electric vehicles could cut emissions in half.`,
      estimatedImpactKg: Math.round(totalKm * (EMISSION_FACTORS.car_solo - EMISSION_FACTORS.car_shared) * 10) / 10,
      relatedAction: {
        category: 'transport',
        subtype: 'car_shared',
        quantity: Math.round(totalKm / soloCarCommutesThisWeek.length),
        unit: 'km',
        description: 'Carpooled to work instead of solo driving',
      },
    })
  }

  // --- HEURISTIC 3: Frequency / Diet Habits ---
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

  // --- HEURISTIC 4: Spike Detection (1 single action exceeds 2x rolling category average) ---
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
    insights.push({
      id: 'general_eco',
      category: 'energy',
      severity: 'info',
      message: 'Great job maintaining your logs! Small actions like turning off unused electronics, walking for trips under 2 km, and air-drying laundry keep your emissions low.',
      estimatedImpactKg: 1.2,
      relatedAction: {
        category: 'transport',
        subtype: 'walk',
        quantity: 1.5,
        unit: 'km',
        description: 'Walked to run a quick errand',
      },
    })
  }

  return insights.slice(0, 3) // Return top 1-3 insights
}
