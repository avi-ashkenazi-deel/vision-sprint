'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Discipline = 'DEV' | 'PRODUCT' | 'DATA' | 'DESIGNER'

interface DisciplineOption {
  id: Discipline
  title: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}

const disciplines: DisciplineOption[] = [
  {
    id: 'DEV',
    title: 'Developer',
    description: 'Build features, write code, and create technical solutions',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
  },
  {
    id: 'PRODUCT',
    title: 'Product',
    description: 'Define requirements, manage scope, and drive product vision',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
  },
  {
    id: 'DATA',
    title: 'Data',
    description: 'Analyze data, build models, and derive insights',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
  },
  {
    id: 'DESIGNER',
    title: 'Designer',
    description: 'Create user experiences, interfaces, and visual designs',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/50',
  },
]

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selected, setSelected] = useState<Discipline | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  const handleSubmit = async () => {
    if (!selected) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/user/discipline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discipline: selected }),
      })

      if (res.ok) {
        // Force a session refresh by reloading
        window.location.href = '/'
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save discipline')
      }
    } catch (err) {
      setError('Failed to save discipline. Please try again.')
    } finally {
      setSubmitting(false)
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
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">Welcome to VisionSprint!</h1>
          <p className="text-gray-400 text-lg">
            What&apos;s your primary discipline? This helps us form balanced teams.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            This cannot be changed later, so choose carefully.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {disciplines.map((discipline) => (
            <button
              key={discipline.id}
              onClick={() => setSelected(discipline.id)}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                selected === discipline.id
                  ? `${discipline.bgColor} ${discipline.borderColor} scale-[1.02]`
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <div className={`${discipline.color} mb-3`}>
                {discipline.icon}
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${
                selected === discipline.id ? discipline.color : 'text-white'
              }`}>
                {discipline.title}
              </h3>
              <p className="text-sm text-gray-400">
                {discipline.description}
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : selected ? `Continue as ${disciplines.find(d => d.id === selected)?.title}` : 'Select your discipline'}
        </button>
      </div>
    </div>
  )
}
