'use client'

import { ReactNode } from 'react'
import { SessionProvider } from './SessionProvider'
import { AppStateProvider } from './AppStateProvider'
import { OnboardingGuard } from './OnboardingGuard'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AppStateProvider>
        <OnboardingGuard>{children}</OnboardingGuard>
      </AppStateProvider>
    </SessionProvider>
  )
}
