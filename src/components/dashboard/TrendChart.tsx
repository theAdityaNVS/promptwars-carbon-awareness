'use client'

import React, { useState } from 'react'
import { Card } from '../ui/Card'
import { useLogStore } from '@/lib/state/useLogStore'
import { selectTrendData } from '@/lib/state/selectors'

type ChartView = 'total' | 'transport' | 'diet' | 'energy'

export const TrendChart: React.FC = () => {
  const { entries } = useLogStore()
  const trendData = selectTrendData(entries, 14)
  const [activeView, setActiveView] = useState<ChartView>('total')

  const hasData = entries.length > 0

  // SVG parameters
  const width = 600
  const height = 240
  const paddingLeft = 40
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 40

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  // Find max value in dataset for proper scaling
  const maxVal = Math.max(
    ...trendData.map((d) => {
      if (activeView === 'total') return d.total
      if (activeView === 'transport') return d.transport
      if (activeView === 'diet') return d.diet
      return d.energy
    }),
    1 // Prevents division by zero
  )

  // Scale data points to SVG coordinates
  const points = trendData.map((d, i) => {
    const value =
      activeView === 'total'
        ? d.total
        : activeView === 'transport'
        ? d.transport
        : activeView === 'diet'
        ? d.diet
        : d.energy

    const x = paddingLeft + (i / (trendData.length - 1)) * chartWidth
    const y = height - paddingBottom - (value / maxVal) * chartHeight
    return { x, y, value, dateLabel: d.dateLabel }
  })

  // Create path data for line
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Create path data for gradient fill below line
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : ''

  const views: { id: ChartView; label: string; colorClass: string; gradientColors: string }[] = [
    { id: 'total', label: 'Combined', colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20', gradientColors: 'from-violet-500/20 to-transparent' },
    { id: 'transport', label: 'Transport', colorClass: 'text-violet-500 bg-violet-500/10 border-violet-500/20', gradientColors: 'from-violet-500/20 to-transparent' },
    { id: 'diet', label: 'Diet', colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', gradientColors: 'from-emerald-500/20 to-transparent' },
    { id: 'energy', label: 'Energy', colorClass: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', gradientColors: 'from-cyan-500/20 to-transparent' },
  ]


  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Footprint Trends</h3>
          <p className="text-xs text-zinc-500">Historical view of the last 14 days (kg CO2e)</p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-300 ${
                activeView === v.id
                  ? 'bg-zinc-800 text-white border border-zinc-700/80 shadow-md shadow-black/25'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-[240px] flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/5">
          Awaiting emission logs to populate trends graph.
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            {/* Definitions for Gradients */}
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeView === 'diet' ? '#10b981' : activeView === 'energy' ? '#06b6d4' : '#8b5cf6'} stopOpacity="0.25" />
                <stop offset="100%" stopColor={activeView === 'diet' ? '#10b981' : activeView === 'energy' ? '#06b6d4' : '#8b5cf6'} stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingTop + ratio * chartHeight
              const label = Math.round(maxVal - ratio * maxVal)
              return (
                <g key={ratio} className="opacity-45">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#27272a"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    fill="#71717a"
                    fontSize="9.5"
                    fontWeight="500"
                    textAnchor="end"
                  >
                    {label}
                  </text>
                </g>
              )
            })}

            {/* Filled Area */}
            {points.length > 0 && (
              <path
                d={areaPath}
                fill="url(#chartGradient)"
                className="transition-all duration-500"
              />
            )}

            {/* Polyline path */}
            {points.length > 0 && (
              <path
                d={linePath}
                fill="none"
                stroke={activeView === 'diet' ? '#10b981' : activeView === 'energy' ? '#06b6d4' : '#8b5cf6'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500"
              />
            )}

            {/* Hover Dot Indicators */}
            {points.map((p, i) => (
              <g key={i} className="group cursor-pointer">
                {/* Invisible hover trigger */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="12"
                  fill="transparent"
                />
                {/* Displayed circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill={activeView === 'diet' ? '#10b981' : activeView === 'energy' ? '#06b6d4' : '#8b5cf6'}
                  stroke="#09090b"
                  strokeWidth="1.5"
                  className="group-hover:scale-150 transition-all duration-200"
                />
                {/* Tooltip on hover */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <rect
                    x={p.x - 40}
                    y={p.y - 32}
                    width="80"
                    height="20"
                    rx="6"
                    fill="#18181b"
                    stroke="#3f3f46"
                    strokeWidth="1"
                  />
                  <text
                    x={p.x}
                    y={p.y - 19}
                    fill="#fafafa"
                    fontSize="9.5"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {p.value.toFixed(1)} kg
                  </text>
                </g>
              </g>
            ))}

            {/* X Axis Labels */}
            {points.map((p, i) => {
              // Show every 2nd or 3rd label on small scales to avoid overlaps
              if (i % 2 !== 0 && i !== points.length - 1) return null
              return (
                <text
                  key={i}
                  x={p.x}
                  y={height - paddingBottom + 18}
                  fill="#71717a"
                  fontSize="9.5"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {p.dateLabel}
                </text>
              )
            })}
          </svg>
        </div>
      )}
    </Card>
  )
}
