'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useAppState } from '@/components/providers/AppStateProvider'
import { useState } from 'react'
import Image from 'next/image'

export function Navigation() {
  const { data: session, status } = useSession()
  const { appState } = useAppState()
  const pathname = usePathname()
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
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="/logo.svg"
              alt="VisionSprint"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Center nav items - only show when logged in */}
          {session && <div className="hidden md:flex items-center gap-1">
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
          <div className="flex items-center gap-4">
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
    </nav>
  )
}
