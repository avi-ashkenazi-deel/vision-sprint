'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppState } from '@/components/providers/AppStateProvider'
import { ProjectForm } from '@/components/ProjectForm'
import type { ProjectType } from '@/types'

interface Project {
  id: string
  name: string
  description: string
  pitchVideoUrl: string | null
  docLink: string | null
  projectType: ProjectType
  slackChannel: string
  creatorId: string
}

export default function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const { appState } = useAppState()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${id}`)
        if (res.ok) {
          const data = await res.json()
          setProject(data)

          // Check if user can edit
          if (
            session &&
            data.creatorId !== session.user.id &&
            !session.user.isAdmin
          ) {
            router.push(`/projects/${id}`)
          }
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Failed to fetch project:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchProject()
    }
  }, [id, status, session, router])

  // During sprint, only slack and doc are editable
  const restrictedEdit =
    appState?.stage === 'EXECUTING_SPRINT' && !appState?.testMode

  // During sprint over, nothing is editable (redirect)
  useEffect(() => {
    if (appState?.stage === 'SPRINT_OVER' && !appState?.testMode) {
      router.push(`/projects/${id}`)
    }
  }, [appState, id, router])

  if (loading || status === 'loading') {
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

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Project not found</h1>
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            Back to projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to project
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Edit Project</h1>
        {restrictedEdit && (
          <p className="text-amber-400 mt-2">
            During sprint, you can only edit the Slack channel and document links.
          </p>
        )}
      </div>

      <div className="glass-card p-6">
        <ProjectForm
          mode="edit"
          initialData={project}
          restrictedEdit={restrictedEdit}
        />
      </div>
    </div>
  )
}
