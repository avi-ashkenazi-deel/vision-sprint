'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { ClothBackground } from '@/components/ClothBackground'
import { KineticText } from '@/components/KineticText'

type Provider = {
  id: string
  name: string
  type: string
}

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')
  
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)
  const [devEmail, setDevEmail] = useState('alice@example.com')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    getProviders().then(setProviders)
  }, [])

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await signIn('dev-login', { email: devEmail, callbackUrl })
  }

  const hasGoogleProvider = providers?.google

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 relative">
      <ClothBackground />

      {/* Kinetic Typography */}
      <div className="w-full max-w-xl relative z-10 mb-2">
        <KineticText />
      </div>

      <div className="w-full max-w-md text-center relative z-10">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--badge-red-bg)] border border-[var(--accent-red)] text-[var(--badge-red-text)] text-sm">
            {error === 'OAuthSignin' && 'Error starting sign in process. Google OAuth may not be configured.'}
            {error === 'OAuthCallback' && 'Error completing sign in.'}
            {error === 'CredentialsSignin' && 'Invalid credentials.'}
            {error === 'AccessDenied' && 'Access denied. Only @deel.com emails are allowed.'}
            {error === 'Default' && 'An error occurred. Please try again.'}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-white/[0.06] text-white font-medium py-3 px-4 rounded-xl border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.2] transition-all mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Development Login - only shown in development */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="p-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 mb-6">
            <p className="text-[var(--badge-amber-text)] text-sm font-medium mb-3">
              Development Mode
            </p>
            <form onSubmit={handleDevLogin}>
              <input
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="Enter email"
                className="input-field mb-3 text-center"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign in as Test User'}
              </button>
            </form>
            <p className="text-xs text-[var(--badge-amber-text)] opacity-80 mt-3">
              Try: alice@example.com (admin) or bob@example.com
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
