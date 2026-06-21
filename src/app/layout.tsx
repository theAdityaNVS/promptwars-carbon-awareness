import type { Metadata } from 'next'
import './globals.css'
import { PageShell } from '@/components/layout/PageShell'

export const metadata: Metadata = {
  title: 'CarbonPulse — Personal Carbon Footprint Tracker & Assistant',
  description:
    'Track your daily transport, diet, and home energy consumption. Receive personalized, context-aware reduction tips to lower your ecological footprint.',
  keywords: ['carbon footprint', 'sustainability', 'greenhouse gas', 'carbon offset', 'commuter', 'eco-friendly'],
  authors: [{ name: 'Aditya Nadamuni' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="antialiased">
        <PageShell>{children}</PageShell>
      </body>
    </html>
  )
}
