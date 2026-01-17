'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAppState } from '@/components/providers/AppStateProvider'
import { ProjectCard } from '@/components/ProjectCard'
import { EmptyState } from '@/components/EmptyState'
import { PROJECT_TYPE_LABELS, type ProjectType } from '@/types'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string
  projectType: ProjectType
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  votes: {
    user: {
      id: string
      name: string | null
      image: string | null
    }
  }[]
  _count: {
    votes: number
  }
  hasVoted: boolean
  updatedAt: string
}

export default function HomePage() {
  const { data: session } = useSession()
  const { appState } = useAppState()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ProjectType | 'ALL'>('ALL')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (projectId: string) => {
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    if (res.ok) {
      fetchProjects()
    }
  }

  const handleUnvote = async (projectId: string) => {
    const res = await fetch(`/api/votes?projectId=${projectId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      fetchProjects()
    }
  }

  const filteredProjects = filter === 'ALL'
    ? projects
    : projects.filter((p) => p.projectType === filter)

  const projectTypes: (ProjectType | 'ALL')[] = [
    'ALL',
    'MOONSHOT',
    'SMALL_FEATURE',
    'DELIGHT',
    'EFFICIENCY',
  ]

  const isSubmissionsOpen = appState?.stage === 'RECEIVING_SUBMISSIONS' || appState?.testMode

  // Redirect based on stage
  if (appState?.stage === 'EXECUTING_SPRINT') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Sprint in Progress</h1>
          <p className="text-gray-400 mb-8">Teams are working on their projects!</p>
          <Link href="/sprint" className="btn-primary">
            View Sprint Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (appState?.stage === 'SPRINT_OVER') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <h1 className="text-3xl font-bold mb-4">Vision Sprint Complete!</h1>
          <p className="text-gray-400 mb-8">Watch the project videos and rate them!</p>
          <Link href="/showcase" className="btn-primary">
            View Showcase
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Project Ideas</h1>
          <p className="text-gray-400 mt-1">
            {isSubmissionsOpen
              ? 'Vote for your favorite ideas or submit your own'
              : 'Submissions are currently closed'}
          </p>
        </div>

        {isSubmissionsOpen && session && (
          <Link href="/projects/new" className="btn-primary whitespace-nowrap">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit Project
            </span>
          </Link>
        )}
      </div>

      {/* Filters */}
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {projectTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === type
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {type === 'ALL' ? 'All Projects' : PROJECT_TYPE_LABELS[type]}
              {type !== 'ALL' && (
                <span className="ml-2 text-xs opacity-60">
                  ({projects.filter((p) => p.projectType === type).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-6 bg-white/5 rounded w-24 mb-4"></div>
              <div className="h-6 bg-white/5 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-white/5 rounded w-full mb-4"></div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-white/5 rounded-full"></div>
                <div className="h-4 bg-white/5 rounded w-20"></div>
              </div>
              <div className="h-10 bg-white/5 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <EmptyState />
      )}

      {/* Projects grid */}
      {!loading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <div
              key={project.id}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProjectCard
                id={project.id}
                name={project.name}
                description={project.description}
                projectType={project.projectType}
                creator={project.creator}
                voters={project.votes.map((v) => v.user)}
                voteCount={project._count.votes}
                hasVoted={project.hasVoted}
                updatedAt={project.updatedAt}
                onVote={handleVote}
                onUnvote={handleUnvote}
                canEdit={session?.user?.id === project.creator.id || session?.user?.isAdmin}
              />
            </div>
          ))}
        </div>
      )}

      {/* No results for filter */}
      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No projects found for this category</p>
          <button
            onClick={() => setFilter('ALL')}
            className="text-purple-400 hover:text-purple-300 mt-2"
          >
            View all projects
          </button>
        </div>
      )}
    </div>
  )
}
