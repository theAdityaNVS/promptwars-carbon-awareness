'use client'

import React from 'react'
import { Category } from '@/types'

interface CategorySelectorProps {
  activeCategory: Category
  onChange: (category: Category) => void
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  activeCategory,
  onChange,
}) => {
  const categories: { id: Category; label: string; icon: string; color: string; hoverBg: string }[] = [
    { id: 'transport', label: 'Transport', icon: '🚲', color: 'from-violet-500/20 to-violet-500/10 text-violet-400 border-violet-500/30', hoverBg: 'hover:bg-violet-500/5' },
    { id: 'diet', label: 'Diet & Meals', icon: '🥗', color: 'from-emerald-500/20 to-emerald-500/10 text-emerald-400 border-emerald-500/30', hoverBg: 'hover:bg-emerald-500/5' },
    { id: 'energy', label: 'Home Energy', icon: '⚡', color: 'from-cyan-500/20 to-cyan-500/10 text-cyan-400 border-cyan-500/30', hoverBg: 'hover:bg-cyan-500/5' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all duration-300 cursor-pointer ${
              isActive
                ? `bg-gradient-to-b ${cat.color} font-bold scale-[1.02] shadow-lg shadow-black/25`
                : `bg-zinc-900/40 border-zinc-800/80 text-zinc-400 ${cat.hoverBg} hover:text-zinc-200`
            }`}
          >
            <span className="text-2xl mb-1">{cat.icon}</span>
            <span className="text-xs font-semibold">{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
