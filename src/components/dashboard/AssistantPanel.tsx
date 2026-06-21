'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useLogStore } from '@/lib/state/useLogStore'
import { Insight, AssistantResponse } from '@/types'

export const AssistantPanel: React.FC = () => {
  const router = useRouter()
  const { entries, baseline } = useLogStore()
  const [isPending, startTransition] = useTransition()
  const [response, setResponse] = useState<AssistantResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch insights from Assistant API
  const fetchInsights = async () => {
    setError(null)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries, baseline }),
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch insights: ${res.statusText}`)
      }

      const data: AssistantResponse = await res.json()
      setResponse(data)
    } catch (err: any) {
      console.error(err)
      setError('Could not reach the assistant. Falling back to offline mode.')
    }
  }

  // Refetch when entries or baseline configuration changes
  useEffect(() => {
    if (entries.length > 0 || baseline) {
      startTransition(async () => {
        await fetchInsights()
      })
    }
  }, [entries, baseline])

  // Handle CTA button click (related action pre-fill)
  const handleRelatedAction = (action: Partial<typeof entries[0]>) => {
    if (!action) return
    const params = new URLSearchParams()
    if (action.category) params.set('category', action.category)
    if (action.subtype) params.set('subtype', action.subtype)
    if (action.quantity) params.set('quantity', action.quantity.toString())
    if (action.unit) params.set('unit', action.unit)
    if (action.description) params.set('description', action.description)
    
    router.push(`/log?${params.toString()}`)
  }

  const suggestionChips = [
    { label: '🚲 Drove less? Log a bike ride', query: 'category=transport&subtype=bike&quantity=5&unit=km&description=Substituted%20driving%20with%20biking' },
    { label: '🥗 Log a meat-free meal', query: 'category=diet&subtype=vegetarian_meal&quantity=1&unit=meal&description=Healthy%20plant-based%20dinner' },
    { label: '⚡ Update baseline energy', query: 'baseline=true' },
  ]

  const getSeverityBadge = (sev: Insight['severity']) => {
    switch (sev) {
      case 'warning':
        return <Badge variant="warning">Alert</Badge>
      case 'tip':
        return <Badge variant="success">Tip</Badge>
      default:
        return <Badge variant="info">Info</Badge>
    }
  }

  return (
    <Card className="p-6 flex flex-col h-full min-h-[350px] justify-between border-zinc-800/80">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <h3 className="text-sm font-bold text-white">Carbon Assistant</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                {response?.source === 'rules+llm' ? 'AI-Augmented Advice' : 'Rule-Based Analyzer'}
              </p>
            </div>
          </div>
          {isPending && (
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs text-zinc-500">Analyzing...</span>
            </div>
          )}
        </div>

        {/* Dynamic aria-live area for screen readers */}
        <div aria-live="polite" className="space-y-4 min-h-[140px] flex flex-col justify-center">
          {isPending && !response ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-zinc-900 rounded-lg w-1/4" />
              <div className="h-16 bg-zinc-900 rounded-lg w-full" />
              <div className="h-8 bg-zinc-900 rounded-lg w-1/3" />
            </div>
          ) : error ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-amber-300 font-semibold">{error}</p>
              <Button onClick={fetchInsights} variant="secondary" size="sm">
                Retry Connection
              </Button>
            </div>
          ) : response?.insights && response.insights.length > 0 ? (
            <div className="space-y-4">
              {response.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/10 space-y-3 hover:border-zinc-700/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    {getSeverityBadge(insight.severity)}
                    {insight.estimatedImpactKg > 0 && (
                      <span className="text-[11px] font-bold text-emerald-400">
                        -{insight.estimatedImpactKg.toFixed(1)} kg CO2e
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-200">
                    {insight.message}
                  </p>
                  {insight.relatedAction && (
                    <Button
                      onClick={() => handleRelatedAction(insight.relatedAction!)}
                      variant="primary"
                      size="sm"
                      className="text-xs py-1.5 px-3 rounded-lg"
                    >
                      Act on suggestion
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-500 space-y-2">
              <p className="text-xs">Your assistant is waiting for habit data.</p>
              <p className="text-[11px] text-zinc-600">
                Log today's actions or load a sample week to unlock personalized carbon advice.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="mt-6 pt-4 border-t border-zinc-900 space-y-2.5">
        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          {suggestionChips.map((chip, i) => (
            <button
              key={i}
              onClick={() => {
                if (chip.query === 'baseline=true') {
                  // Trigger reset of baseline state in parent/store
                  const store = useLogStore.getState()
                  store.setBaseline(null)
                  router.push('/')
                } else {
                  router.push(`/log?${chip.query}`)
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-800/40 hover:border-zinc-700 text-[11px] text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
