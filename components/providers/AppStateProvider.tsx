'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { AppStateWithSprint, Sprint } from '@/types'

interface AppStateContextType {
  appState: AppStateWithSprint | null
  loading: boolean
  refreshAppState: () => Promise<void>
  // Sprint browsing
  sprints: Sprint[]
  selectedSprintId: string | null
  setSelectedSprintId: (id: string | null) => void
  activeSprint: Sprint | null // The sprint being viewed (current or past)
  isViewingPastSprint: boolean
}

const AppStateContext = createContext<AppStateContextType>({
  appState: null,
  loading: true,
  refreshAppState: async () => {},
  sprints: [],
  selectedSprintId: null,
  setSelectedSprintId: () => {},
  activeSprint: null,
  isViewingPastSprint: false,
})

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppStateWithSprint | null>(null)
  const [loading, setLoading] = useState(true)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)

  const refreshAppState = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/state')
      if (res.ok) {
        const data = await res.json()
        setAppState(data)
        // Default selected sprint to the current sprint
        if (!selectedSprintId && data.currentSprintId) {
          setSelectedSprintId(data.currentSprintId)
        }
      }
    } catch (error) {
      console.error('Failed to fetch app state:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedSprintId])

  const fetchSprints = useCallback(async () => {
    try {
      const res = await fetch('/api/sprints')
      if (res.ok) {
        const data = await res.json()
        setSprints(data)
      }
    } catch (error) {
      console.error('Failed to fetch sprints:', error)
    }
  }, [])

  useEffect(() => {
    refreshAppState()
    fetchSprints()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive the active sprint (the one being viewed)
  const activeSprint: Sprint | null = (() => {
    if (!selectedSprintId) return appState?.currentSprint || null
    // Check if it's the current sprint
    if (selectedSprintId === appState?.currentSprintId) {
      return appState?.currentSprint || null
    }
    // Find in the sprints list
    return sprints.find((s) => s.id === selectedSprintId) || null
  })()

  const isViewingPastSprint = !!(
    selectedSprintId &&
    appState?.currentSprintId &&
    selectedSprintId !== appState.currentSprintId
  )

  return (
    <AppStateContext.Provider
      value={{
        appState,
        loading,
        refreshAppState,
        sprints,
        selectedSprintId,
        setSelectedSprintId,
        activeSprint,
        isViewingPastSprint,
      }}
    >
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
