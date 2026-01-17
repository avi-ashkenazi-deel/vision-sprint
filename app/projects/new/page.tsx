'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ProjectForm } from '@/components/ProjectForm'

export default function NewProjectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/projects/new')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-48 mb-8"></div>
          <div className="glass-card p-6 space-y-4">
            <div className="h-12 bg-white/5 rounded"></div>
            <div className="h-32 bg-white/5 rounded"></div>
            <div className="h-12 bg-white/5 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Submit a Project</h1>
        <p className="text-gray-400 mt-2">
          Share your hackathon idea with the team
        </p>
      </div>

      <div className="glass-card p-6">
        <ProjectForm mode="create" />
      </div>
    </div>
  )
}
