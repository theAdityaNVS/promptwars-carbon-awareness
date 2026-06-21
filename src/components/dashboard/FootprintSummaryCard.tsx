'use client'

import React from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useLogStore } from '@/lib/state/useLogStore'
import {
  selectTodayMetrics,
  selectWeeklyMetrics,
  selectWeekOverWeekChange,
} from '@/lib/state/selectors'

export const FootprintSummaryCard: React.FC = () => {
  const { entries } = useLogStore()
  
  const todayMetrics = selectTodayMetrics(entries)
  const weeklyMetrics = selectWeeklyMetrics(entries)
  const wowChange = selectWeekOverWeekChange(entries)

  const hasData = entries.length > 0

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0
    return Math.round((value / total) * 100)
  }

  const transportPct = getPercentage(weeklyMetrics.byCategory.transport, weeklyMetrics.total)
  const dietPct = getPercentage(weeklyMetrics.byCategory.diet, weeklyMetrics.total)
  const energyPct = getPercentage(weeklyMetrics.byCategory.energy, weeklyMetrics.total)

  return (
    <Card className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80">
      {/* Today's Footprint */}
      <div className="space-y-3 pb-6 md:pb-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Today's Footprint</h3>
          <Badge variant="info">Live</Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight text-white">
            {hasData ? todayMetrics.total : '0.00'}
          </span>
          <span className="text-xs font-medium text-zinc-500">kg CO2e</span>
        </div>
        <p className="text-xs text-zinc-500">
          Estimated footprint from actions logged today.
        </p>
      </div>

      {/* Weekly Accumulation */}
      <div className="space-y-3 py-6 md:py-0 md:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Weekly Footprint</h3>
          {wowChange !== 0 && (
            <Badge variant={wowChange < 0 ? 'success' : 'danger'}>
              {wowChange < 0 ? '↓' : '↑'} {Math.abs(wowChange)}% vs last week
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight text-white">
            {hasData ? weeklyMetrics.total : '0.00'}
          </span>
          <span className="text-xs font-medium text-zinc-500">kg CO2e</span>
        </div>
        <p className="text-xs text-zinc-500">
          Total footprint accumulated over the last 7 days.
        </p>
      </div>

      {/* Category Distribution */}
      <div className="space-y-4 py-6 md:py-0 md:pl-6 flex flex-col justify-center">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Weekly Category Share</h3>
        
        {weeklyMetrics.total > 0 ? (
          <div className="space-y-3">
            {/* Transport Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-zinc-300">
                <span>Transport</span>
                <span>{transportPct}% ({weeklyMetrics.byCategory.transport} kg)</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${transportPct}%` }}
                />
              </div>
            </div>

            {/* Diet Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-zinc-300">
                <span>Diet</span>
                <span>{dietPct}% ({weeklyMetrics.byCategory.diet} kg)</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${dietPct}%` }}
                />
              </div>
            </div>

            {/* Energy Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-zinc-300">
                <span>Home Energy</span>
                <span>{energyPct}% ({weeklyMetrics.byCategory.energy} kg)</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${energyPct}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-zinc-500">
            No categories logged yet. Feed sample data to explore.
          </div>
        )}
      </div>
    </Card>
  )
}
