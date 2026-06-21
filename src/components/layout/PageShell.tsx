import React from 'react'
import { NavBar } from './NavBar'

interface PageShellProps {
  children: React.ReactNode
}

export const PageShell: React.FC<PageShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-violet-500/35 selection:text-white">
      {/* Navigation */}
      <NavBar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            <p>&copy; {new Date().getFullYear()} CarbonPulse. Built for PromptWars Challenge 3.</p>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-zinc-300 transition-colors">Urban Commuter Persona</span>
            <span>&bull;</span>
            <span className="hover:text-zinc-300 transition-colors">Rules + LLM Hybrid Engine</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
