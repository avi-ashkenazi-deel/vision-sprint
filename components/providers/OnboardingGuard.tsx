'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Pages that don't require full onboarding/verification
const PUBLIC_PATHS = ['/auth/signin', '/api', '/verify-access']
const ONBOARDING_PATH = '/onboarding'

// Set to true to enable the password gate
const ENABLE_PASSWORD_GATE = false

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Skip if loading
    if (status === 'loading') return
    
    // Skip for public paths
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) return

    // If authenticated, check onboarding requirements
    if (status === 'authenticated' && session?.user) {
      // Password gate (disabled by default)
      if (ENABLE_PASSWORD_GATE && !session.user.accessVerified) {
        if (pathname !== '/verify-access') {
          router.push('/verify-access')
        }
        return
      }

      // Check discipline selection (onboarding)
      if (!session.user.discipline) {
        if (pathname !== ONBOARDING_PATH) {
          router.push(ONBOARDING_PATH)
        }
        return
      }
    }
  }, [status, session, pathname, router])

  // Show loading spinner while checking
  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // If authenticated but no discipline, and not on onboarding page, show spinner
  if (
    status === 'authenticated' &&
    session?.user &&
    !session.user.discipline &&
    pathname !== ONBOARDING_PATH &&
    !PUBLIC_PATHS.some(path => pathname.startsWith(path))
  ) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return <>{children}</>
}
