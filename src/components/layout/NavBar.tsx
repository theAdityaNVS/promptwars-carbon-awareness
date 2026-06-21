'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NavBar: React.FC = () => {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Log Action', path: '/log' },
    { name: 'Insights', path: '/insights' },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Title */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform duration-300">
                C
              </div>
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-violet-400 transition-colors duration-300">
                CarbonPulse
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-1 sm:space-x-4">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-sm shadow-violet-500/5'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 border border-transparent'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
