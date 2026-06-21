'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { useLogStore } from '@/lib/state/useLogStore'
import { Category, TransportMode } from '@/types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { CategorySelector } from './CategorySelector'

// Zod validation schemas
const logEntrySchema = z.object({
  category: z.enum(['transport', 'diet', 'energy']),
  subtype: z.string().min(1, 'Please select a specific action type'),
  quantity: z.number().positive('Quantity must be greater than zero').max(5000, 'Quantity is too large'),
  unit: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().max(200, 'Description must be under 200 characters').optional(),
})

const ActionLogFormInner: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addEntry } = useLogStore()

  // State fields
  const [category, setCategory] = useState<Category>('transport')
  const [subtype, setSubtype] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSuccess, setShowSuccess] = useState(false)

  // Initialize and handle query parameters pre-fill
  useEffect(() => {
    // Set default date to today in YYYY-MM-DD local timezone
    const todayStr = new Date().toISOString().split('T')[0]
    setDate(todayStr)

    const catParam = searchParams.get('category') as Category
    const subParam = searchParams.get('subtype')
    const qtyParam = searchParams.get('quantity')
    const descParam = searchParams.get('description')

    if (catParam && ['transport', 'diet', 'energy'].includes(catParam)) {
      setCategory(catParam)
    }
    if (subParam) {
      setSubtype(subParam)
    } else {
      // Set sensible default subtype when category changes
      if (catParam === 'transport' || (!catParam && category === 'transport')) {
        setSubtype('car_solo')
      } else if (catParam === 'diet') {
        setSubtype('beef_meal')
      } else if (catParam === 'energy') {
        setSubtype('kwh_grid')
      }
    }
    if (qtyParam) {
      setQuantity(qtyParam)
    }
    if (descParam) {
      setDescription(descParam)
    }
  }, [searchParams])

  // Handle category selector changes
  const handleCategoryChange = (newCat: Category) => {
    setCategory(newCat)
    // Update default subtype accordingly
    if (newCat === 'transport') {
      setSubtype('car_solo')
    } else if (newCat === 'diet') {
      setSubtype('beef_meal')
    } else if (newCat === 'energy') {
      setSubtype('kwh_grid')
    }
  }

  // Get units for active category/subtype
  const getUnitLabel = () => {
    if (category === 'transport') return 'km'
    if (category === 'diet') return 'meals'
    return 'kWh'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setShowSuccess(false)

    const rawData = {
      category,
      subtype,
      quantity: parseFloat(quantity),
      unit: getUnitLabel(),
      date,
      description: description || undefined,
    }

    // Validate with Zod
    const validationResult = logEntrySchema.safeParse(rawData)

    if (!validationResult.success) {
      const formattedErrors: Record<string, string> = {}
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          formattedErrors[err.path[0].toString()] = err.message
        }
      })
      setErrors(formattedErrors)
      return
    }

    // Add entry to state store
    addEntry({
      id: Math.random().toString(36).substring(2, 11), // Unique local ID
      ...validationResult.data,
    })

    // Show success message and redirect
    setShowSuccess(true)
    setTimeout(() => {
      router.push('/')
    }, 1200)
  }

  return (
    <Card className="max-w-lg mx-auto p-6 md:p-8 space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Log Environmental Action</h2>
        <p className="text-xs text-zinc-400">
          Enter details about your daily activity to calculate and log its carbon impact.
        </p>
      </div>

      {showSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold text-center animate-scale-in">
          ✓ Carbon action logged successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category Tab Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Activity Category
          </label>
          <CategorySelector activeCategory={category} onChange={handleCategoryChange} />
        </div>

        {/* Dynamic Action Subtype Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="subtype" className="text-xs font-semibold text-zinc-300">
            Action / Mode Type
          </label>
          <select
            id="subtype"
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
          >
            {category === 'transport' && (
              <>
                <option value="car_solo">Drove Solo (Car)</option>
                <option value="car_shared">Carpooled (Car)</option>
                <option value="ev">Electric Vehicle (EV)</option>
                <option value="bus">Public Bus</option>
                <option value="train">Train / Subway</option>
                <option value="bike">Bicycle</option>
                <option value="walk">Walking / Running</option>
              </>
            )}
            {category === 'diet' && (
              <>
                <option value="beef_meal">Beef Meal (Steak, Burger, Pork)</option>
                <option value="chicken_meal">Chicken / Poultry / Fish Meal</option>
                <option value="vegetarian_meal">Vegetarian / Vegan Meal</option>
              </>
            )}
            {category === 'energy' && (
              <>
                <option value="kwh_grid">Grid Electricity Consumption</option>
              </>
            )}
          </select>
          {errors.subtype && <span className="text-[11px] text-red-400">{errors.subtype}</span>}
        </div>

        {/* Quantity and Unit Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quantity" className="text-xs font-semibold text-zinc-300">
            Quantity ({getUnitLabel()})
          </label>
          <div className="relative">
            <input
              id="quantity"
              type="number"
              step="any"
              min="0.01"
              max="5000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              placeholder={`e.g. ${category === 'transport' ? '15' : '1'}`}
              required
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">
              {getUnitLabel()}
            </span>
          </div>
          {errors.quantity && <span className="text-[11px] text-red-400">{errors.quantity}</span>}
        </div>

        {/* Date Field */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-xs font-semibold text-zinc-300">
            Date of Action
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
            required
          />
          {errors.date && <span className="text-[11px] text-red-400">{errors.date}</span>}
        </div>

        {/* Short Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-xs font-semibold text-zinc-300 flex justify-between">
            <span>Description</span>
            <span className="text-[10px] text-zinc-500">Optional</span>
          </label>
          <input
            id="description"
            type="text"
            maxLength={100}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
            placeholder="e.g. Commute to downtown office"
          />
          {errors.description && <span className="text-[11px] text-red-400">{errors.description}</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3">
          <Button
            type="button"
            onClick={() => router.push('/')}
            variant="outline"
            size="md"
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" className="flex-1 max-w-[200px]">
            Log Carbon Action
          </Button>
        </div>
      </form>
    </Card>
  )
}

// Next.js App Router useSearchParams() must be wrapped in a Suspense boundary
export const ActionLogForm: React.FC = () => {
  return (
    <Suspense
      fallback={
        <Card className="max-w-lg mx-auto p-6 md:p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-xs text-zinc-500 animate-pulse">Loading action log...</div>
        </Card>
      }
    >
      <ActionLogFormInner />
    </Suspense>
  )
}
export default ActionLogForm
