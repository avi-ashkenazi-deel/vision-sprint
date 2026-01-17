'use client'

import { ReactNode } from 'react'
import { SessionProvider } from './SessionProvider'
import { AppStateProvider } from './AppStateProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </SessionProvider>
  )
}
