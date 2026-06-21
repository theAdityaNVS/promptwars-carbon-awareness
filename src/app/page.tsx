'use client'

import React from 'react'
import { useLogStore } from '@/lib/state/useLogStore'
import { OnboardingPrompt } from '@/components/dashboard/OnboardingPrompt'
import { FootprintSummaryCard } from '@/components/dashboard/FootprintSummaryCard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { AssistantPanel } from '@/components/dashboard/AssistantPanel'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function Home() {
  const { entries, baseline, clearStore } = useLogStore()

  const hasOnboarded = entries.length > 0 || baseline !== null

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Daily Footprint Tracker
          </h1>
          <p className="text-sm text-zinc-400">
            Monitor commute habits, dietary impacts, and home utility consumption.
          </p>
        </div>
        {hasOnboarded && (
          <div className="flex items-center gap-2">
            <Link href="/log">
              <Button variant="primary" size="md">
                + Log An Action
              </Button>
            </Link>
            <Button
              onClick={clearStore}
              variant="outline"
              size="md"
              className="text-zinc-400 hover:text-red-400 hover:border-red-500/25"
            >
              Reset Data
            </Button>
          </div>
        )}
      </div>

      {/* Conditionally Render Onboarding or Dashboard Grid */}
      {!hasOnboarded ? (
        <div className="py-8 md:py-16">
          <OnboardingPrompt />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Analytics: Summary metrics and Inline SVG Trends Graph */}
          <div className="lg:col-span-2 space-y-8">
            <FootprintSummaryCard />
            <TrendChart />
          </div>

          {/* Interactive AI Assistant Advice & Quick Action Chips */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <AssistantPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
