'use client'

import React, { useState } from 'react'
import { useLogStore } from '@/lib/state/useLogStore'
import { selectWeeklyMetrics } from '@/lib/state/selectors'
import { calculateEntryFootprint } from '@/lib/carbon/calculate'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Category } from '@/types'

export default function InsightsPage() {
  const { entries } = useLogStore()
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')

  const weeklyMetrics = selectWeeklyMetrics(entries)

  // Calculate followed suggestions savings
  // (We identify followed suggestions by descriptions containing "Substituted" or "plant-based" or custom tags)
  const followedSuggestions = entries.filter(
    (e) => e.description?.includes('Substituted') || e.description?.includes('plant-based')
  )
  const tipsFollowedCount = followedSuggestions.length
  
  // Calculate savings: e.g. for every car commute substituted with bus/bike, calculate the difference from solo driving
  // Substituted driving with biking: saved 25km * 0.192 = 4.8 kg CO2e
  // Healthy plant-based dinner: saved 1 beef meal = 5.4 kg CO2e
  const totalSavings = followedSuggestions.reduce((acc, curr) => {
    if (curr.subtype === 'bike') {
      return acc + curr.quantity * 0.192 // Drove solo comparison
    }
    if (curr.subtype === 'vegetarian_meal') {
      return acc + (6.0 - 0.6) // Beef meal comparison
    }
    return acc + 1.5
  }, 0)

  // Filtered log entries
  const filteredEntries = entries.filter((e) => filterCategory === 'all' || e.category === filterCategory)

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getSubtypeLabel = (subtype: string) => {
    const labels: Record<string, string> = {
      car_solo: 'Drove Solo (Car)',
      car_shared: 'Carpooled (Car)',
      ev: 'Electric Vehicle (EV)',
      bus: 'Public Bus',
      train: 'Train / Subway',
      bike: 'Bicycle',
      walk: 'Walking',
      beef_meal: 'Beef Meal',
      chicken_meal: 'Chicken / Poultry Meal',
      vegetarian_meal: 'Vegetarian Meal',
      kwh_grid: 'Grid Electricity',
    }
    return labels[subtype] ?? subtype
  }

  const getCategoryBadge = (cat: Category) => {
    switch (cat) {
      case 'transport':
        return <Badge variant="info">Transport</Badge>
      case 'diet':
        return <Badge variant="success">Diet</Badge>
      default:
        return <Badge variant="neutral">Energy</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="border-b border-zinc-900 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Insights & History</h1>
        <p className="text-sm text-zinc-400">
          Review your ecological footprints, historical actions, and reduction impact.
        </p>
      </div>

      {/* Stretch Goal: Followed Suggestions Banner */}
      {tipsFollowedCount > 0 && (
        <Card className="p-5 border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
              <span>🎉</span> Reduction Loop Achievements
            </h3>
            <p className="text-xs text-zinc-300">
              You acted on <strong className="text-white font-bold">{tipsFollowedCount} assistant tips</strong>, avoiding approximately <strong className="text-emerald-400 font-bold">{totalSavings.toFixed(1)} kg CO2e</strong> in emissions!
            </p>
          </div>
          <div className="text-center sm:text-right">
            <span className="text-2xl font-extrabold text-emerald-400">-{totalSavings.toFixed(1)} kg</span>
          </div>
        </Card>
      )}

      {/* Breakdown Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 space-y-2 border-zinc-800/80">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Weekly Average</h3>
          <div className="text-2xl font-extrabold text-white">
            {entries.length > 0 ? (weeklyMetrics.total / 7).toFixed(2) : '0.00'}{' '}
            <span className="text-xs font-normal text-zinc-500">kg/day</span>
          </div>
          <p className="text-[10px] text-zinc-500">Daily average emissions computed over the last week.</p>
        </Card>

        <Card className="p-5 space-y-2 border-zinc-800/80">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions Logged</h3>
          <div className="text-2xl font-extrabold text-white">
            {entries.length} <span className="text-xs font-normal text-zinc-500">records</span>
          </div>
          <p className="text-[10px] text-zinc-500">Total number of carbon activities stored in browser cache.</p>
        </Card>

        <Card className="p-5 space-y-2 border-zinc-800/80">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Highest Footprint Cat</h3>
          <div className="text-2xl font-extrabold text-white capitalize">
            {entries.length > 0
              ? Object.entries(weeklyMetrics.byCategory).sort((a, b) => b[1] - a[1])[0][0]
              : 'None'}
          </div>
          <p className="text-[10px] text-zinc-500">The category contributing the most emissions this week.</p>
        </Card>
      </div>

      {/* Historical Ledger Table / Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white">Activity History Ledger</h2>
          
          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['all', 'transport', 'diet', 'energy'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all duration-300 ${
                  filterCategory === cat
                    ? 'bg-zinc-800 text-white border-zinc-700/80'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                {cat === 'all' ? 'All Activities' : cat}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/5">
            No logged items found matching the selected filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const footprint = calculateEntryFootprint(entry)
              const isTipSuccess = entry.description?.includes('Substituted') || entry.description?.includes('plant-based')

              return (
                <Card
                  key={entry.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-zinc-900/80 ${
                    isTipSuccess ? 'bg-emerald-500/5 border-emerald-500/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                      {entry.category === 'transport' ? '🚲' : entry.category === 'diet' ? '🥗' : '⚡'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {getSubtypeLabel(entry.subtype)}
                        </span>
                        {getCategoryBadge(entry.category)}
                        {isTipSuccess && (
                          <Badge variant="success" className="text-[9px]">
                            Tip Followed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {entry.quantity} {entry.unit} &bull; {formatDate(entry.date)}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-zinc-500 italic">&ldquo;{entry.description}&rdquo;</p>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end gap-1 border-t sm:border-0 border-zinc-900 pt-2 sm:pt-0">
                    <span className="text-xs text-zinc-500 sm:hidden">Calculated Emissions:</span>
                    <span className="text-sm font-bold text-zinc-200">
                      {footprint.toFixed(2)} kg CO2e
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
