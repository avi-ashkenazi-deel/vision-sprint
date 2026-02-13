'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useAppState } from '@/components/providers/AppStateProvider'
import { useState } from 'react'
import Image from 'next/image'

export function Navigation() {
  const { data: session, status } = useSession()
  const { appState, sprints, selectedSprintId, setSelectedSprintId, activeSprint, isViewingPastSprint } = useAppState()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSprintDropdown, setShowSprintDropdown] = useState(false)

  const getStageLabel = () => {
    const stage = activeSprint?.stage || appState?.stage
    switch (stage) {
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
    const stage = activeSprint?.stage || appState?.stage
    switch (stage) {
      case 'RECEIVING_SUBMISSIONS':
        return 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]'
      case 'EXECUTING_SPRINT':
        return 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)]'
      case 'SPRINT_OVER':
        return 'bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)]'
      default:
        return 'bg-[var(--badge-gray-bg)] text-[var(--badge-gray-text)]'
    }
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${pathname === '/auth/signin' ? 'bg-black/80 backdrop-blur-sm border-b border-white/[0.06]' : 'bg-[var(--nav-bg)] border-b border-[var(--card-border)]'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 relative">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="/logo.svg"
              alt="VisionSprint"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Center nav items - only show when logged in */}
          {session && <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <Link
              href="/"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === '/'
                  ? 'text-white bg-white/15'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Home
            </Link>
            <Link
              href="/visions"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === '/visions'
                  ? 'text-white bg-white/15'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Visions
            </Link>
            {session?.user?.isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === '/admin'
                    ? 'text-white bg-white/15'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Admin
              </Link>
            )}
          </div>}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Sprint selector dropdown */}
            {session && sprints.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowSprintDropdown(!showSprintDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:border-[var(--accent-purple)] transition-colors"
                >
                  <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="max-w-[120px] truncate">
                    {activeSprint?.name || 'Select Sprint'}
                  </span>
                  {isViewingPastSprint && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">Archive</span>
                  )}
                  <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showSprintDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSprintDropdown(false)} />
                    <div className="absolute right-0 mt-1 w-56 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg p-1 z-20 max-h-64 overflow-y-auto">
                      {sprints.map((sprint) => {
                        const isCurrent = sprint.id === appState?.currentSprintId
                        const isSelected = sprint.id === selectedSprintId
                        return (
                          <button
                            key={sprint.id}
                            onClick={() => {
                              setSelectedSprintId(sprint.id)
                              setShowSprintDropdown(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                              isSelected
                                ? 'bg-[var(--accent-purple)]/20 text-white'
                                : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{sprint.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 ml-2 shrink-0">
                                Current
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Stage badge */}
            <div className={`badge ${getStageColor()}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-2"></span>
              {getStageLabel()}
              {appState?.testMode && (
                <span className="ml-1.5 text-xs opacity-60">(Test)</span>
              )}
            </div>

            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-[var(--background)] animate-pulse"></div>
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
                      className="rounded-full ring-2 ring-[var(--card-border)]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-sm font-medium text-white">
                      {session.user?.name?.[0] || '?'}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg p-1.5 z-20">
                      <div className="px-3 py-2.5 border-b border-[var(--card-border)] mb-1.5">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{session.user?.name}</p>
                        <p className="text-xs text-[var(--foreground-secondary)] truncate">{session.user?.email}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowUserMenu(false)
                          signOut({ callbackUrl: '/auth/signin' })
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-md transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
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

      {/* Archive banner when viewing a past sprint */}
      {isViewingPastSprint && activeSprint && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-sm text-amber-400">
            Viewing <strong>{activeSprint.name}</strong> archive (read-only)
          </span>
          <button
            onClick={() => setSelectedSprintId(appState?.currentSprintId || null)}
            className="ml-3 text-xs text-amber-300 underline hover:text-amber-200 transition-colors"
          >
            Back to current sprint
          </button>
        </div>
      )}
    </nav>
  )
}
