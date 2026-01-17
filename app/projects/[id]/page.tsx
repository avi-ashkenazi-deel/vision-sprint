'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAppState } from '@/components/providers/AppStateProvider'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, type ProjectType } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'

interface Project {
  id: string
  name: string
  description: string
  pitchVideoUrl: string | null
  docLink: string | null
  projectType: ProjectType
  slackChannel: string
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
  teams: {
    id: string
    teamName: string
    teamNumber: number
    members: {
      user: {
        id: string
        name: string | null
        image: string | null
      }
    }[]
    submission: {
      videoUrl: string
    } | null
  }[]
  _count: {
    votes: number
  }
  hasVoted: boolean
  createdAt: string
  updatedAt: string
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const { appState } = useAppState()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchProject()
  }, [id])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      } else if (res.status === 404) {
        router.push('/')
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!session) return
    
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id }),
    })
    if (res.ok) {
      fetchProject()
    }
  }

  const handleUnvote = async () => {
    if (!session) return
    
    const res = await fetch(`/api/votes?projectId=${id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      fetchProject()
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/')
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const canEdit = session?.user?.id === project?.creator.id || session?.user?.isAdmin
  const canDelete = canEdit && (appState?.stage === 'RECEIVING_SUBMISSIONS' || appState?.testMode)
  const isSubmissionsOpen = appState?.stage === 'RECEIVING_SUBMISSIONS' || appState?.testMode

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-24 mb-4"></div>
          <div className="h-10 bg-white/5 rounded w-3/4 mb-8"></div>
          <div className="glass-card p-6 space-y-4">
            <div className="h-4 bg-white/5 rounded w-full"></div>
            <div className="h-4 bg-white/5 rounded w-5/6"></div>
            <div className="h-4 bg-white/5 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to projects
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <span className={`badge ${PROJECT_TYPE_COLORS[project.projectType]} mb-3`}>
            {PROJECT_TYPE_LABELS[project.projectType]}
          </span>
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          {session && isSubmissionsOpen && (
            <button
              onClick={project.hasVoted ? handleUnvote : handleVote}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                project.hasVoted
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              <svg
                className={`w-5 h-5 ${project.hasVoted ? 'fill-purple-400' : ''}`}
                fill={project.hasVoted ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {project.hasVoted ? 'Voted' : 'Vote'}
              <span className="text-sm opacity-70">({project._count.votes})</span>
            </button>
          )}

          {canEdit && (
            <Link
              href={`/projects/${id}/edit`}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </Link>
          )}

          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-secondary text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{project.description}</p>
          </div>

          {/* Pitch video */}
          {project.pitchVideoUrl && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4">Pitch Video</h2>
              <a
                href={project.pitchVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Watch Pitch Video
              </a>
            </div>
          )}

          {/* Teams (if assigned) */}
          {project.teams.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4">Teams</h2>
              <div className="space-y-4">
                {project.teams.map((team) => (
                  <div key={team.id} className="p-4 rounded-lg bg-white/5">
                    <h3 className="font-medium mb-3">{team.teamName}</h3>
                    <div className="flex items-center gap-2">
                      {team.members.map((member) => (
                        <div
                          key={member.user.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5"
                        >
                          {member.user.image ? (
                            <Image
                              src={member.user.image}
                              alt={member.user.name || ''}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px]">
                              {getInitials(member.user.name)}
                            </div>
                          )}
                          <span className="text-sm">{member.user.name}</span>
                        </div>
                      ))}
                    </div>
                    {team.submission && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <a
                          href={team.submission.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          View Submission Video
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Creator */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Created by</h2>
            <div className="flex items-center gap-3">
              {project.creator.image ? (
                <Image
                  src={project.creator.image}
                  alt={project.creator.name || ''}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  {getInitials(project.creator.name)}
                </div>
              )}
              <span className="font-medium">{project.creator.name}</span>
            </div>
          </div>

          {/* Links */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Links</h2>
            <div className="space-y-3">
              {project.docLink && (
                <a
                  href={project.docLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Document / Figma
                </a>
              )}
              <a
                href={`https://slack.com/app_redirect?channel=${project.slackChannel}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                #{project.slackChannel}
              </a>
            </div>
          </div>

          {/* Voters */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              Votes ({project._count.votes})
            </h2>
            {project.votes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.votes.map((vote) => (
                  <div
                    key={vote.user.id}
                    className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5"
                    title={vote.user.name || undefined}
                  >
                    {vote.user.image ? (
                      <Image
                        src={vote.user.image}
                        alt={vote.user.name || ''}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-[10px]">
                        {getInitials(vote.user.name)}
                      </div>
                    )}
                    <span className="text-sm text-gray-300">{vote.user.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No votes yet</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="glass-card p-6">
            <div className="space-y-2 text-sm text-gray-400">
              <p>Created: {formatDate(project.createdAt)}</p>
              <p>Updated: {formatDate(project.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Delete Project?</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-primary bg-red-500 hover:bg-red-600"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
