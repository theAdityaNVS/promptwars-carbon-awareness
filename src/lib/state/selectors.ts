import { LogEntry, Category } from '@/types'
import { aggregateByPeriod } from '@/lib/carbon/calculate'

// Helper to get date string in YYYY-MM-DD
const getISOStringDate = (date: Date) => {
  return date.toISOString().split('T')[0]
}

/**
 * Selects entries matching a specific date.
 */
export const selectEntriesForDate = (entries: LogEntry[], dateStr: string) => {
  return entries.filter((e) => e.date === dateStr)
}

/**
 * Derived metrics for Today.
 */
export const selectTodayMetrics = (entries: LogEntry[]) => {
  const todayStr = getISOStringDate(new Date())
  const todayEntries = selectEntriesForDate(entries, todayStr)
  return aggregateByPeriod(todayEntries)
}

/**
 * Derived metrics for the last 7 days (including today).
 */
export const selectWeeklyMetrics = (entries: LogEntry[]) => {
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6) // Last 7 days

  return aggregateByPeriod(entries, {
    from: getISOStringDate(sevenDaysAgo),
    to: getISOStringDate(today),
  })
}

/**
 * Derived metrics representing a 14-day history trend.
 * Returns an array of { date: string, total: number, transport: number, diet: number, energy: number }
 */
export const selectTrendData = (entries: LogEntry[], daysCount = 14) => {
  const trend = []
  const today = new Date()

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = getISOStringDate(d)
    const dayEntries = selectEntriesForDate(entries, dateStr)
    const { total, byCategory } = aggregateByPeriod(dayEntries)
    
    // Friendly date format for charting (e.g. "Jun 21")
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    trend.push({
      dateStr,
      dateLabel,
      total,
      transport: byCategory.transport,
      diet: byCategory.diet,
      energy: byCategory.energy,
    })
  }

  return trend
}

/**
 * Calculates percentage change between this week and the prior week.
 */
export const selectWeekOverWeekChange = (entries: LogEntry[]) => {
  const today = new Date()
  
  // This week: [today - 6 days, today]
  const startThisWeek = new Date(today)
  startThisWeek.setDate(today.getDate() - 6)
  const thisWeekData = aggregateByPeriod(entries, {
    from: getISOStringDate(startThisWeek),
    to: getISOStringDate(today),
  })

  // Prior week: [today - 13 days, today - 7 days]
  const endPriorWeek = new Date(startThisWeek)
  endPriorWeek.setDate(startThisWeek.getDate() - 1)
  const startPriorWeek = new Date(endPriorWeek)
  startPriorWeek.setDate(endPriorWeek.getDate() - 6)
  
  const priorWeekData = aggregateByPeriod(entries, {
    from: getISOStringDate(startPriorWeek),
    to: getISOStringDate(endPriorWeek),
  })

  if (priorWeekData.total === 0) return thisWeekData.total > 0 ? 100 : 0
  const change = ((thisWeekData.total - priorWeekData.total) / priorWeekData.total) * 100
  return Math.round(change * 10) / 10
}
