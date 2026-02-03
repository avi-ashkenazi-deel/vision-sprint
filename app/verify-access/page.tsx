'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'

export default function VerifyAccessPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // Redirect if already verified
  if (status === 'authenticated' && session?.user?.accessVerified) {
    router.push('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/user/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Verification failed')
      }

      // Update session to reflect the change
      await update()
      
      // Redirect to home or onboarding
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="glass-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[var(--accent-purple)] flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Access Verification</h1>
            <p className="text-[var(--foreground-secondary)]">
              Enter the access password to continue to VisionSprint
            </p>
          </div>

          {/* User info */}
          {session?.user && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--background)] border border-[var(--card-border)] mb-6">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full ring-2 ring-[var(--card-border)]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-sm font-medium text-white">
                  {getInitials(session.user.name)}
                </div>
              )}
              <div>
                <p className="font-medium text-[var(--foreground)]">{session.user.name}</p>
                <p className="text-sm text-[var(--foreground-secondary)]">{session.user.email}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-lg bg-[var(--badge-red-bg)] border border-[var(--accent-red)] text-[var(--badge-red-text)] mb-6">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Access Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter the access password"
                className="input-field"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                </span>
              ) : (
                'Verify Access'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--foreground-secondary)] mt-6">
            Don&apos;t have the password? Ask your team lead.
          </p>
        </div>
      </div>
    </div>
  )
}
