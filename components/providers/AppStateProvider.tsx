'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { AppState } from '@prisma/client'

interface AppStateContextType {
  appState: AppState | null
  loading: boolean
  refreshAppState: () => Promise<void>
}

const AppStateContext = createContext<AppStateContextType>({
  appState: null,
  loading: true,
  refreshAppState: async () => {},
})

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshAppState = async () => {
    try {
      const res = await fetch('/api/admin/state')
      if (res.ok) {
        const data = await res.json()
        setAppState(data)
      }
    } catch (error) {
      console.error('Failed to fetch app state:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAppState()
  }, [])

  return (
    <AppStateContext.Provider value={{ appState, loading, refreshAppState }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}
