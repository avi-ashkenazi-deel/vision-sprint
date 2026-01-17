'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useAppState } from '@/components/providers/AppStateProvider'
import { useState } from 'react'
import Image from 'next/image'

export function Navigation() {
  const { data: session, status } = useSession()
  const { appState } = useAppState()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const getStageLabel = () => {
    switch (appState?.stage) {
      case 'RECEIVING_SUBMISSIONS':
        return 'Submissions Open'
      case 'EXECUTING_SPRINT':
        return 'Sprint in Progress'
      case 'SPRINT_OVER':
        return 'Showcase'
      default:
        return 'Loading...'
    }
  }

  const getStageColor = () => {
    switch (appState?.stage) {
      case 'RECEIVING_SUBMISSIONS':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'EXECUTING_SPRINT':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'SPRINT_OVER':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-t-0 border-x-0 rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-lg">VisionSprint</span>
          </Link>

          {/* Stage badge */}
          <div className={`badge ${getStageColor()}`}>
            <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
            {getStageLabel()}
            {appState?.testMode && (
              <span className="ml-2 text-xs opacity-60">(Test Mode)</span>
            )}
          </div>

          {/* Navigation links & User */}
          <div className="flex items-center gap-6">
            {session?.user?.isAdmin && (
              <Link
                href="/admin"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Admin
              </Link>
            )}

            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-medium">
                      {session.user?.name?.[0] || '?'}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 glass-card p-2">
                    <div className="px-3 py-2 border-b border-white/10 mb-2">
                      <p className="text-sm font-medium truncate">{session.user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/signin" className="btn-primary text-sm">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
