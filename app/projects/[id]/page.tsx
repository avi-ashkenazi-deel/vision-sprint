'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAppState } from '@/components/providers/AppStateProvider'
import { VideoEmbed } from '@/components/VideoEmbed'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, VISION_AREA_COLORS, type ProjectType } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface ProjectListItem {
  id: string
  name: string
  _count: { votes: number }
}

interface Project {
  id: string
  name: string
  description: string
  pitchVideoUrl: string | null
  docLink: string | null
  projectType: ProjectType
  slackChannel: string
  businessRationale: string | null
  vision: {
    id: string
    title: string
    area: string
  } | null
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
  joins: {
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
    joins: number
  }
  hasVoted: boolean
  hasJoined: boolean
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
  const [allProjects, setAllProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchProject()
    fetchAllProjects()
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

  const fetchAllProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        // Sort by votes descending
        const sorted = data.sort((a: ProjectListItem, b: ProjectListItem) => 
          b._count.votes - a._count.votes
        )
        setAllProjects(sorted)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  // Find current index and prev/next projects
  const currentIndex = allProjects.findIndex(p => p.id === id)
  const prevProject = currentIndex > 0 ? allProjects[currentIndex - 1] : null
  const nextProject = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null

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

  const handleJoin = async () => {
    if (!session) return
    
    const res = await fetch('/api/joins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id }),
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
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to projects
        </Link>

        {/* Prev/Next navigation */}
        {allProjects.length > 1 && (
          <div className="flex items-center gap-2">
            {prevProject ? (
              <Link
                href={`/projects/${prevProject.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
                title={prevProject.name}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline max-w-[120px] truncate">{prevProject.name}</span>
                <span className="sm:hidden">Prev</span>
              </Link>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-600">← Prev</div>
            )}
            
            <span className="text-xs text-gray-500 px-2">
              {currentIndex + 1} / {allProjects.length}
            </span>

            {nextProject ? (
              <Link
                href={`/projects/${nextProject.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
                title={nextProject.name}
              >
                <span className="hidden sm:inline max-w-[120px] truncate">{nextProject.name}</span>
                <span className="sm:hidden">Next</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-600">Next →</div>
            )}
          </div>
        )}
      </div>

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
            <>
              {/* Like button */}
              <button
                onClick={project.hasVoted ? handleUnvote : handleVote}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  project.hasVoted
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-pink-500/10 hover:border-pink-500/30 hover:text-pink-300'
                }`}
              >
                <svg 
                  className={`w-5 h-5 ${project.hasVoted ? 'fill-pink-400' : ''}`} 
                  fill={project.hasVoted ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{project.hasVoted ? 'Liked' : 'Like'}</span>
                <span className="text-sm opacity-70">({project._count.votes})</span>
              </button>

              {/* Join button */}
              <button
                onClick={handleJoin}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  project.hasJoined
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300'
                }`}
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {project.hasJoined ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  )}
                </svg>
                <span>{project.hasJoined ? 'Joined' : 'Join'}</span>
                <span className="text-sm opacity-70">({project._count.joins})</span>
              </button>
            </>
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
            {project.description.includes('docs.google.com/document') ? (
              <div>
                <div className="rounded-lg overflow-hidden border border-white/10">
                  <div className="bg-white/5 px-3 py-2 text-xs text-gray-400 flex items-center justify-between">
                    <span>Project Document</span>
                    <a 
                      href={project.description} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                  <iframe
                    src={project.description.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview').includes('/preview') 
                      ? project.description.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview')
                      : (() => {
                          const match = project.description.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)
                          return match ? `https://docs.google.com/document/d/${match[1]}/preview` : project.description
                        })()
                    }
                    width="100%"
                    height="600"
                    className="bg-white"
                    title="Project Description Document"
                  />
                </div>
              </div>
            ) : (
              <div className="prose max-w-none break-words overflow-hidden">
                <ReactMarkdown>{project.description}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Pitch video */}
          {project.pitchVideoUrl && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4">Pitch Video</h2>
              <VideoEmbed url={project.pitchVideoUrl} title={`${project.name} - Pitch`} />
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
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-gray-400 mb-3">Submission Video</p>
                        <VideoEmbed 
                          url={team.submission.videoUrl} 
                          title={`${team.teamName} - Submission`} 
                        />
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

          {/* Related Vision */}
          {project.vision && (
            <div className="glass-card p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-3">Related Vision</h2>
              <Link
                href="/visions"
                className="block p-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors"
              >
                <span className={`badge text-xs mb-2 ${VISION_AREA_COLORS[project.vision.area] || VISION_AREA_COLORS['Other']}`}>
                  {project.vision.area}
                </span>
                <p className="font-medium text-white">{project.vision.title}</p>
              </Link>
            </div>
          )}

          {/* Business Rationale */}
          {project.businessRationale && (
            <div className="glass-card p-6">
              <h2 className="text-sm font-medium text-gray-400 mb-3">Business Rationale</h2>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{project.businessRationale}</p>
            </div>
          )}

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

          {/* People who want to join */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              <span className="text-emerald-400">Want to Join</span> ({project._count.joins})
            </h2>
            {project.joins.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.joins.map((join) => (
                  <div
                    key={join.user.id}
                    className="flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                    title={join.user.name || undefined}
                  >
                    {join.user.image ? (
                      <Image
                        src={join.user.image}
                        alt={join.user.name || ''}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500/50 to-teal-500/50 flex items-center justify-center text-[10px]">
                        {getInitials(join.user.name)}
                      </div>
                    )}
                    <span className="text-sm text-emerald-300">{join.user.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No one has joined yet</p>
            )}
          </div>

          {/* Likes */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              <span className="text-pink-400">Likes</span> ({project._count.votes})
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
              <p className="text-gray-500 text-sm">No likes yet</p>
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
