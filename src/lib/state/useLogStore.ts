import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LogEntry, UserBaseline } from '@/types'

interface LogStore {
  entries: LogEntry[]
  baseline: UserBaseline | null
  addEntry: (entry: LogEntry) => void
  setBaseline: (baseline: UserBaseline | null) => void
  loadSampleWeek: () => void
  clearStore: () => void
}

export const useLogStore = create<LogStore>()(
  persist(
    (set) => ({
      entries: [],
      baseline: null,

      addEntry: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries],
        })),

      setBaseline: (baseline) =>
        set(() => ({
          baseline,
        })),

      loadSampleWeek: () => {
        const today = new Date()
        const entries: LogEntry[] = []

        // Helper to get date string relative to today
        const getRelativeDateISO = (daysAgo: number) => {
          const d = new Date(today)
          d.setDate(today.getDate() - daysAgo)
          return d.toISOString().split('T')[0]
        }

        // Generate ~7 days of realistic commuter & consumer actions
        // Day 6 ago
        entries.push({
          id: 's1',
          date: getRelativeDateISO(6),
          category: 'transport',
          subtype: 'car_solo',
          quantity: 25,
          unit: 'km',
          description: 'Daily office commute (solo)',
        })
        entries.push({
          id: 's2',
          date: getRelativeDateISO(6),
          category: 'diet',
          subtype: 'beef_meal',
          quantity: 1,
          unit: 'meal',
          description: 'Lunch steak sandwich',
        })

        // Day 5 ago
        entries.push({
          id: 's3',
          date: getRelativeDateISO(5),
          category: 'transport',
          subtype: 'car_solo',
          quantity: 25,
          unit: 'km',
          description: 'Daily office commute (solo)',
        })
        entries.push({
          id: 's4',
          date: getRelativeDateISO(5),
          category: 'diet',
          subtype: 'chicken_meal',
          quantity: 1,
          unit: 'meal',
          description: 'Chicken salad dinner',
        })

        // Day 4 ago
        entries.push({
          id: 's5',
          date: getRelativeDateISO(4),
          category: 'transport',
          subtype: 'bus',
          quantity: 12,
          unit: 'km',
          description: 'Took the bus instead of driving',
        })
        entries.push({
          id: 's6',
          date: getRelativeDateISO(4),
          category: 'diet',
          subtype: 'vegetarian_meal',
          quantity: 2,
          unit: 'meal',
          description: 'Vegetarian curry and rice',
        })

        // Day 3 ago
        entries.push({
          id: 's7',
          date: getRelativeDateISO(3),
          category: 'transport',
          subtype: 'car_shared',
          quantity: 25,
          unit: 'km',
          description: 'Carpooled with a coworker',
        })
        entries.push({
          id: 's8',
          date: getRelativeDateISO(3),
          category: 'energy',
          subtype: 'kwh_grid',
          quantity: 45,
          unit: 'kWh',
          description: 'Weekly household utility baseline usage',
        })

        // Day 2 ago
        entries.push({
          id: 's9',
          date: getRelativeDateISO(2),
          category: 'transport',
          subtype: 'bike',
          quantity: 6,
          unit: 'km',
          description: 'Rode bike to local grocer',
        })
        entries.push({
          id: 's10',
          date: getRelativeDateISO(2),
          category: 'diet',
          subtype: 'beef_meal',
          quantity: 1,
          unit: 'meal',
          description: 'Burger night with family',
        })

        // Day 1 ago (Yesterday)
        entries.push({
          id: 's11',
          date: getRelativeDateISO(1),
          category: 'transport',
          subtype: 'car_solo',
          quantity: 20,
          unit: 'km',
          description: 'Drove to gym and back',
        })
        entries.push({
          id: 's12',
          date: getRelativeDateISO(1),
          category: 'diet',
          subtype: 'vegetarian_meal',
          quantity: 3,
          unit: 'meal',
          description: 'Full green day (plant-based diet)',
        })

        // Today
        entries.push({
          id: 's13',
          date: getRelativeDateISO(0),
          category: 'transport',
          subtype: 'walk',
          quantity: 2,
          unit: 'km',
          description: 'Walked to coffee shop',
        })

        set(() => ({
          entries,
          // Set a default representative baseline when loading a sample week
          baseline: {
            commuteMode: 'car_solo',
            commuteKmPerWeek: 125,
            dietPattern: 'high_meat',
            kwhPerWeek: 50,
          },
        }))
      },

      clearStore: () =>
        set(() => ({
          entries: [],
          baseline: null,
        })),
    }),
    {
      name: 'carbon-tracker-store',
    }
  )
)
