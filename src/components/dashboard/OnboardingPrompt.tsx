'use client'

import React, { useState } from 'react'
import { useLogStore } from '@/lib/state/useLogStore'
import { TransportMode } from '@/types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

export const OnboardingPrompt: React.FC = () => {
  const { loadSampleWeek, setBaseline } = useLogStore()
  const [showForm, setShowForm] = useState(false)
  
  // Form State
  const [commuteMode, setCommuteMode] = useState<TransportMode>('car_solo')
  const [commuteKm, setCommuteKm] = useState('100')
  const [dietPattern, setDietPattern] = useState('high_meat')
  const [energyKwh, setEnergyKwh] = useState('50')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setBaseline({
      commuteMode,
      commuteKmPerWeek: parseFloat(commuteKm) || 0,
      dietPattern,
      kwhPerWeek: parseFloat(energyKwh) || 0,
    })
  }

  return (
    <Card className="max-w-xl mx-auto p-6 md:p-8 animate-fade-in">
      {!showForm ? (
        <div className="text-center space-y-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 text-2xl">
            🌱
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome to CarbonPulse</h2>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Track, analyze, and optimize your carbon footprint. Select how you would like to begin.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700/80 bg-zinc-900/30 transition-all flex flex-col justify-between space-y-4">
              <div className="text-left space-y-1">
                <h3 className="text-sm font-semibold text-white">Interactive Sandbox</h3>
                <p className="text-xs text-zinc-500">
                  Instantly seed the app with a representative week of carbon actions (driving, meals, utilities) to see charts and insights.
                </p>
              </div>
              <Button onClick={loadSampleWeek} variant="primary" size="sm" className="w-full">
                Load Sample Week
              </Button>
            </div>

            <div className="border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700/80 bg-zinc-900/30 transition-all flex flex-col justify-between space-y-4">
              <div className="text-left space-y-1">
                <h3 className="text-sm font-semibold text-white">Personalized Baseline</h3>
                <p className="text-xs text-zinc-500">
                  Fill out a brief 4-question profile about your typical weekly habits to calculate your footprint compared to averages.
                </p>
              </div>
              <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="w-full">
                Setup My Baseline
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Set Your Baseline Habits</h2>
            <p className="text-xs text-zinc-400">
              We use these numbers to estimate your weekly footprint and frame your daily actions.
            </p>
          </div>

          <div className="space-y-4">
            {/* Commute Mode */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="commuteMode" className="text-xs font-semibold text-zinc-300">
                Primary Commute Method
              </label>
              <select
                id="commuteMode"
                value={commuteMode}
                onChange={(e) => setCommuteMode(e.target.value as TransportMode)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              >
                <option value="car_solo">Car (Solo Driver)</option>
                <option value="car_shared">Carpool (Shared Car)</option>
                <option value="ev">Electric Vehicle (EV)</option>
                <option value="bus">Public Bus</option>
                <option value="train">Train / Metro</option>
                <option value="bike">Bicycle</option>
                <option value="walk">Walking</option>
              </select>
            </div>

            {/* Commute Distance */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="commuteKm" className="text-xs font-semibold text-zinc-300">
                Weekly Commuting Distance (km)
              </label>
              <input
                id="commuteKm"
                type="number"
                min="0"
                max="2000"
                value={commuteKm}
                onChange={(e) => setCommuteKm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                required
              />
            </div>

            {/* Diet Pattern */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dietPattern" className="text-xs font-semibold text-zinc-300">
                Dietary Habit
              </label>
              <select
                id="dietPattern"
                value={dietPattern}
                onChange={(e) => setDietPattern(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              >
                <option value="high_meat">High Meat Consumption (Beef/Pork frequently)</option>
                <option value="low_meat">Low Meat / Fish & Poultry primary</option>
                <option value="veg">Vegetarian / Plant-Based</option>
              </select>
            </div>

            {/* Energy Kwh */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="energyKwh" className="text-xs font-semibold text-zinc-300">
                Weekly Home Grid Electricity (kWh)
              </label>
              <input
                id="energyKwh"
                type="number"
                min="0"
                max="5000"
                value={energyKwh}
                onChange={(e) => setEnergyKwh(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 gap-3">
            <Button
              type="button"
              onClick={() => setShowForm(false)}
              variant="ghost"
              size="sm"
            >
              Back
            </Button>
            <Button type="submit" variant="primary" size="md" className="flex-1 max-w-[200px]">
              Save Baseline
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
