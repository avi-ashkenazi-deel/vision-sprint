'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/components/providers/AppStateProvider'
import { EmptyState } from '@/components/EmptyState'
import { Timer } from '@/components/Timer'
import { VideoEmbed } from '@/components/VideoEmbed'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, REACTION_EMOJIS, type ProjectType, type ReactionType } from '@/types'
import { ConfettiCelebration } from '@/components/ConfettiCelebration'
import { getInitials } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

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
  joins: {
    user: {
      id: string
      name: string | null
      image: string | null
    }
  }[]
  _count: {
    votes: number
    joins: number
  }
  hasVoted: boolean
  hasJoined: boolean
  updatedAt: string
}

interface TeamMember {
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface Team {
  id: string
  teamName: string
  teamNumber: number
  project: {
    id: string
    name: string
    description: string
    projectType: ProjectType
    slackChannel: string
    docLink: string | null
  }
  members: TeamMember[]
  submission: {
    id: string
    videoUrl: string
  } | null
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { appState, loading: appStateLoading } = useAppState()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])
  const [filter, setFilter] = useState<ProjectType | 'ALL'>('ALL')
  const [sortBy, setSortBy] = useState<'votes' | 'name' | 'date' | 'creator' | 'myVote'>('votes')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Join swap modal state
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [swapTargetProjectId, setSwapTargetProjectId] = useState<string | null>(null)
  const [currentJoins, setCurrentJoins] = useState<{ projectId: string; projectName: string }[]>([])
  const [swapping, setSwapping] = useState(false)
  
  // Sprint state
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [submittingTeamId, setSubmittingTeamId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (appState?.stage === 'EXECUTING_SPRINT' || appState?.testMode) {
      fetchTeams()
    }
  }, [appState, session])

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

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setAllTeams(data)
        
        if (session?.user?.id) {
          const userTeams = data.filter((team: Team) =>
            team.members.some((member: TeamMember) => member.user.id === session.user.id)
          )
          setMyTeams(userTeams)
        }
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    }
  }

  const handleSubmitVideo = async (teamId: string) => {
    if (!videoUrl) return
    
    setSubmitting(true)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, videoUrl }),
      })

      if (res.ok) {
        setVideoUrl('')
        setSubmittingTeamId(null)
        fetchTeams()
      }
    } catch (error) {
      console.error('Failed to submit video:', error)
    } finally {
      setSubmitting(false)
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

  const handleJoin = async (projectId: string) => {
    const res = await fetch('/api/joins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    if (res.ok) {
      fetchProjects()
    } else if (res.status === 409) {
      const data = await res.json()
      if (data.maxReached) {
        setSwapTargetProjectId(projectId)
        setCurrentJoins(data.currentJoins)
        setShowSwapModal(true)
      }
    }
  }

  const handleSwapJoin = async (leaveProjectId: string) => {
    setSwapping(true)
    try {
      // First leave the old project
      const leaveRes = await fetch('/api/joins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: leaveProjectId }),
      })
      if (leaveRes.ok) {
        // Then join the new project
        const joinRes = await fetch('/api/joins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: swapTargetProjectId }),
        })
        if (joinRes.ok) {
          fetchProjects()
        }
      }
    } catch (error) {
      console.error('Failed to swap join:', error)
    } finally {
      setSwapping(false)
      setShowSwapModal(false)
      setSwapTargetProjectId(null)
      setCurrentJoins([])
    }
  }

  const handleSort = (column: 'votes' | 'name' | 'date' | 'creator' | 'myVote') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder(column === 'votes' || column === 'myVote' ? 'desc' : 'asc')
    }
  }

  // Count how many projects current user has joined
  const userJoinCount = projects.filter((p) => p.hasJoined).length

  const filteredProjects = filter === 'ALL'
    ? projects
    : projects.filter((p) => p.projectType === filter)

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'votes':
        comparison = a._count.votes - b._count.votes
        break
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'date':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
      case 'creator':
        comparison = (a.creator.name || '').localeCompare(b.creator.name || '')
        break
      case 'myVote':
        // Sort by whether user voted (voted first when desc)
        comparison = (a.hasVoted ? 1 : 0) - (b.hasVoted ? 1 : 0)
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const projectTypes: (ProjectType | 'ALL')[] = [
    'ALL',
    'MOONSHOT',
    'SMALL_FEATURE',
    'DELIGHT',
    'EFFICIENCY',
  ]

  const isSubmissionsOpen = appState?.stage === 'RECEIVING_SUBMISSIONS' || appState?.testMode

  // Show nothing while checking auth (prevents flash of content)
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Sprint dashboard during EXECUTING_SPRINT stage
  if (appState?.stage === 'EXECUTING_SPRINT') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Sprint Dashboard</h1>
        <p className="text-gray-400 mb-8">Build amazing things with your team!</p>

        {/* Timer */}
        {appState?.sprintEndDate && (
          <div className="mb-12">
            <Timer endDate={new Date(appState.sprintEndDate)} label="Time until deadline" />
          </div>
        )}

        {/* My Teams */}
        {myTeams.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-6">Your Teams</h2>
            <div className="space-y-6">
              {myTeams.map((team) => (
                <div key={team.id} className="glass-card p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`badge ${PROJECT_TYPE_COLORS[team.project.projectType]}`}>
                          {PROJECT_TYPE_LABELS[team.project.projectType]}
                        </span>
                        <span className="text-sm text-gray-400">{team.teamName}</span>
                      </div>
                      
                      <h3 className="text-xl font-semibold mb-2">{team.project.name}</h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {team.project.description}
                      </p>

                      {/* Team members */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-sm text-gray-500">Team:</span>
                        {team.members.map((member) => (
                          <div
                            key={member.user.id}
                            className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5"
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
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-[10px]">
                                {getInitials(member.user.name)}
                              </div>
                            )}
                            <span className="text-sm">{member.user.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Links */}
                      <div className="flex items-center gap-4 flex-wrap">
                        {team.project.slackChannel && (
                          <a
                            href={`https://slack.com/app_redirect?channel=${team.project.slackChannel}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
                            </svg>
                            Slack Channel
                          </a>
                        )}
                        {team.project.docLink && (
                          <a
                            href={team.project.docLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Project Documents
                          </a>
                        )}
                        <Link
                          href={`/projects/${team.project.id}/edit`}
                          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit Project
                        </Link>
                      </div>
                    </div>

                    {/* Submission section */}
                    <div className="lg:w-80">
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <h4 className="font-medium mb-3">Video Submission</h4>
                        
                        {submittingTeamId === team.id ? (
                          <div className="space-y-3">
                            <input
                              type="url"
                              value={videoUrl}
                              onChange={(e) => setVideoUrl(e.target.value)}
                              placeholder="YouTube or Google Drive link"
                              className="input-field text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Supports YouTube, Google Drive, Loom, Vimeo
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSubmitVideo(team.id)}
                                disabled={!videoUrl || submitting}
                                className="btn-primary text-sm flex-1"
                              >
                                {submitting ? 'Submitting...' : team.submission ? 'Update' : 'Submit'}
                              </button>
                              <button
                                onClick={() => {
                                  setSubmittingTeamId(null)
                                  setVideoUrl('')
                                }}
                                className="btn-secondary text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : team.submission ? (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-emerald-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm">Video submitted!</span>
                              </div>
                              <button
                                onClick={() => {
                                  setSubmittingTeamId(team.id)
                                  setVideoUrl(team.submission?.videoUrl || '')
                                }}
                                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                              </button>
                            </div>
                            <VideoEmbed 
                              url={team.submission.videoUrl} 
                              title={`${team.teamName} submission`}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => setSubmittingTeamId(team.id)}
                            className="btn-primary text-sm w-full"
                          >
                            Submit Video
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Teams Progress */}
        <div>
          <h2 className="text-xl font-semibold mb-6">All Teams Progress</h2>
          {allTeams.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-gray-400">No teams have been formed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTeams.map((team) => (
                <div key={team.id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge text-xs ${PROJECT_TYPE_COLORS[team.project.projectType]}`}>
                      {PROJECT_TYPE_LABELS[team.project.projectType]}
                    </span>
                    {team.submission ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        Submitted
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400">In Progress</span>
                    )}
                  </div>
                  
                  <h3 className="font-medium mb-1 line-clamp-1">{team.project.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{team.teamName}</p>
                  
                  <div className="flex items-center gap-1">
                    {team.members.slice(0, 4).map((member) => (
                      member.user.image ? (
                        <Image
                          key={member.user.id}
                          src={member.user.image}
                          alt={member.user.name || ''}
                          width={24}
                          height={24}
                          className="rounded-full"
                          title={member.user.name || ''}
                        />
                      ) : (
                        <div
                          key={member.user.id}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-[10px]"
                          title={member.user.name || ''}
                        >
                          {getInitials(member.user.name)}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Showcase state for SPRINT_OVER
  const [showcaseTeams, setShowcaseTeams] = useState<Team[]>([])
  const [showcaseReactions, setShowcaseReactions] = useState<Record<string, { counts: Record<string, number>, userReactions: ReactionType[] }>>({})
  const [selectedShowcaseIndex, setSelectedShowcaseIndex] = useState<number | null>(null)
  const [watchedVideos, setWatchedVideos] = useState<Set<string>>(new Set())
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (appState?.stage === 'SPRINT_OVER' || appState?.testMode) {
      fetchShowcaseData()
    }
  }, [appState])

  const fetchShowcaseData = async () => {
    try {
      const teamsRes = await fetch('/api/teams')
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        const teamsWithSubmissions = teamsData.filter((t: Team) => t.submission)
        setShowcaseTeams(teamsWithSubmissions)

        // Fetch reactions
        const projectIds = [...new Set(teamsWithSubmissions.map((t: Team) => t.project.id))]
        const reactionsData: Record<string, { counts: Record<string, number>, userReactions: ReactionType[] }> = {}
        
        await Promise.all(
          projectIds.map(async (projectId) => {
            const res = await fetch(`/api/reactions?projectId=${projectId}`)
            if (res.ok) {
              const data = await res.json()
              reactionsData[projectId as string] = { 
                counts: data.counts,
                userReactions: session?.user?.id
                  ? data.reactions
                      ?.filter((r: { userId: string }) => r.userId === session.user.id)
                      .map((r: { reactionType: ReactionType }) => r.reactionType) || []
                  : []
              }
            }
          })
        )
        setShowcaseReactions(reactionsData)
      }
    } catch (error) {
      console.error('Failed to fetch showcase data:', error)
    }
  }

  const handleReact = async (projectId: string, type: ReactionType) => {
    if (!session) return

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, reactionType: type }),
      })

      if (res.ok) {
        setShowcaseReactions((prev) => {
          const current = prev[projectId] || { counts: {}, userReactions: [] }
          const hasReaction = current.userReactions.includes(type)
          
          return {
            ...prev,
            [projectId]: {
              counts: {
                ...current.counts,
                [type]: (current.counts[type] || 0) + (hasReaction ? -1 : 1),
              },
              userReactions: hasReaction
                ? current.userReactions.filter((r) => r !== type)
                : [...current.userReactions, type],
            },
          }
        })
      }
    } catch (error) {
      console.error('Failed to react:', error)
    }
  }

  const markVideoWatched = (teamId: string) => {
    setWatchedVideos(prev => {
      const newSet = new Set(prev)
      newSet.add(teamId)
      
      // Check if all videos watched - trigger confetti!
      if (newSet.size === showcaseTeams.length && showcaseTeams.length > 0 && !showConfetti) {
        setShowConfetti(true)
      }
      
      return newSet
    })
  }

  const getTotalReactions = (projectId: string) => {
    const counts = showcaseReactions[projectId]?.counts || {}
    return Object.values(counts).reduce((sum: number, count) => sum + (count as number), 0)
  }

  if (appState?.stage === 'SPRINT_OVER') {
    const sortedTeams = [...showcaseTeams].sort((a, b) => 
      getTotalReactions(b.project.id) - getTotalReactions(a.project.id)
    )

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">🎉 Vision Sprint Complete!</h1>
          <p className="text-gray-400 text-lg">Watch the amazing projects our teams have built</p>
        </div>

        {/* Progress bar */}
        {showcaseTeams.length > 0 && (
          <div className="mb-8 glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Your progress</span>
              <span className="text-sm font-medium text-white">
                {watchedVideos.size} of {showcaseTeams.length} videos watched
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${(watchedVideos.size / showcaseTeams.length) * 100}%` }}
              />
            </div>
            {watchedVideos.size === showcaseTeams.length && showcaseTeams.length > 0 && (
              <p className="text-center text-emerald-400 text-sm mt-2">
                ✨ You&apos;ve watched all videos! Amazing!
              </p>
            )}
          </div>
        )}

        {showcaseTeams.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-400">No video submissions yet</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">#</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Project</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Team</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-400">Reactions</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Watch</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, index) => {
                  const counts = showcaseReactions[team.project.id]?.counts || {}
                  const totalReactions = getTotalReactions(team.project.id)
                  
                  return (
                    <tr 
                      key={team.id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className={`text-lg font-bold ${
                          index === 0 ? 'text-yellow-400' : 
                          index === 1 ? 'text-gray-300' : 
                          index === 2 ? 'text-amber-600' : 'text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{team.project.name}</div>
                        <div className="text-sm text-gray-500">{team.teamName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge text-xs ${PROJECT_TYPE_COLORS[team.project.projectType]}`}>
                          {PROJECT_TYPE_LABELS[team.project.projectType]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {team.members.slice(0, 3).map((member) => (
                            member.user.image ? (
                              <Image
                                key={member.user.id}
                                src={member.user.image}
                                alt={member.user.name || ''}
                                width={28}
                                height={28}
                                className="rounded-full"
                                title={member.user.name || ''}
                              />
                            ) : (
                              <div
                                key={member.user.id}
                                className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-xs"
                                title={member.user.name || ''}
                              >
                                {getInitials(member.user.name)}
                              </div>
                            )
                          ))}
                          {team.members.length > 3 && (
                            <span className="text-xs text-gray-500 ml-1">+{team.members.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <span title="Total reactions" className="text-lg font-semibold text-white">
                            {totalReactions}
                          </span>
                          <div className="flex gap-1 text-sm">
                            {counts['MEDAL'] > 0 && <span>🏅{counts['MEDAL']}</span>}
                            {counts['HEART'] > 0 && <span>❤️{counts['HEART']}</span>}
                            {counts['SHOCK'] > 0 && <span>😮{counts['SHOCK']}</span>}
                            {counts['PARTY'] > 0 && <span>🎉{counts['PARTY']}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {watchedVideos.has(team.id) && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                              Watched
                            </span>
                          )}
                          <button
                            onClick={() => setSelectedShowcaseIndex(index)}
                            className="btn-primary text-sm px-4 py-2"
                          >
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              {watchedVideos.has(team.id) ? 'Rewatch' : 'Watch'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick access link to full showcase */}
        <div className="text-center mt-8">
          <Link href="/showcase" className="text-purple-400 hover:text-purple-300 text-sm">
            View full showcase gallery →
          </Link>
        </div>

        {/* Video modal with auto-advance */}
        {selectedShowcaseIndex !== null && sortedTeams[selectedShowcaseIndex]?.submission && (() => {
          const currentTeam = sortedTeams[selectedShowcaseIndex]
          const projectReactions = showcaseReactions[currentTeam.project.id] || { counts: {}, userReactions: [] }
          
          return (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-4xl">
                <div className="absolute -top-12 right-0 left-0 flex items-center justify-between">
                  <span className="text-gray-400 text-sm">
                    {selectedShowcaseIndex + 1} of {sortedTeams.length}
                  </span>
                  <button
                    onClick={() => setSelectedShowcaseIndex(null)}
                    className="text-white hover:text-gray-300"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-white">{currentTeam.project.name}</h2>
                  <p className="text-gray-400">{currentTeam.teamName}</p>
                </div>
                <VideoEmbed 
                  key={currentTeam.id}
                  url={currentTeam.submission!.videoUrl}
                  title={currentTeam.project.name}
                  autoPlay={true}
                  onEnded={() => {
                    markVideoWatched(currentTeam.id)
                    if (selectedShowcaseIndex < sortedTeams.length - 1) {
                      setSelectedShowcaseIndex(selectedShowcaseIndex + 1)
                    } else {
                      setSelectedShowcaseIndex(null)
                    }
                  }}
                />
                
                {/* Emoji reactions */}
                <div className="flex items-center justify-center gap-2 mt-4 mb-4">
                  {(['MEDAL', 'HEART', 'SHOCK', 'PARTY'] as ReactionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleReact(currentTeam.project.id, type)}
                      className={`flex items-center gap-1 px-4 py-2 rounded-full transition-all ${
                        projectReactions.userReactions.includes(type)
                          ? 'bg-white/20 scale-110'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{REACTION_EMOJIS[type]}</span>
                      <span className="text-sm text-white">{projectReactions.counts[type] || 0}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => {
                      markVideoWatched(currentTeam.id)
                      setSelectedShowcaseIndex(Math.max(0, selectedShowcaseIndex - 1))
                    }}
                    disabled={selectedShowcaseIndex === 0}
                    className="btn-secondary disabled:opacity-30"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    {watchedVideos.size} of {sortedTeams.length} watched
                  </span>
                  <button
                    onClick={() => {
                      markVideoWatched(currentTeam.id)
                      setSelectedShowcaseIndex(Math.min(sortedTeams.length - 1, selectedShowcaseIndex + 1))
                    }}
                    disabled={selectedShowcaseIndex === sortedTeams.length - 1}
                    className="btn-secondary disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Confetti celebration */}
        {showConfetti && (
          <ConfettiCelebration onComplete={() => setShowConfetti(false)} />
        )}
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
            {appStateLoading
              ? 'Loading...'
              : isSubmissionsOpen
                ? 'Vote for your favorite ideas or submit your own'
                : 'Submissions are currently closed'}
          </p>
        </div>

        {(isSubmissionsOpen || appStateLoading) && session && (
          <Link href="/projects/new" className="btn-primary whitespace-nowrap">
            New submission
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
        <div className="glass-card overflow-hidden animate-pulse">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded"></div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <EmptyState />
      )}

      {/* Projects table */}
      {!loading && sortedProjects.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th 
                  className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors w-[30%]"
                  onClick={() => handleSort('name')}
                >
                  <span className="flex items-center gap-1">
                    Project
                    {sortBy === 'name' && (
                      <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </span>
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400 hidden md:table-cell w-24">Type</th>
                <th 
                  className="text-left px-6 py-4 text-sm font-medium text-gray-400 hidden lg:table-cell cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('creator')}
                >
                  <span className="flex items-center gap-1">
                    Creator
                    {sortBy === 'creator' && (
                      <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </span>
                </th>
                <th 
                  className="text-center px-4 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors w-20"
                  onClick={() => handleSort('votes')}
                >
                  <span className="flex items-center justify-center gap-1">
                    Likes
                    {sortBy === 'votes' && (
                      <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </span>
                </th>
                <th className="text-center px-4 py-4 text-sm font-medium text-gray-400 hidden md:table-cell w-20">
                  Joining
                </th>
                <th 
                  className="text-right px-6 py-4 text-sm font-medium text-gray-400 hidden sm:table-cell cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Updated
                    {sortBy === 'date' && (
                      <svg className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </span>
                </th>
                {session && (
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project) => (
                <tr 
                  key={project.id} 
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white hover:text-purple-400 transition-colors">
                      {project.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={`badge text-xs ${PROJECT_TYPE_COLORS[project.projectType]}`}>
                      {PROJECT_TYPE_LABELS[project.projectType]}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      {project.creator.image ? (
                        <Image
                          src={project.creator.image}
                          alt={project.creator.name || ''}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-xs">
                          {getInitials(project.creator.name)}
                        </div>
                      )}
                      <span className="text-sm text-gray-300">{project.creator.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="relative group inline-block">
                      <span className="text-lg font-semibold text-[var(--foreground)] cursor-default">{project._count.votes}</span>
                      {project.votes.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          <div className="text-xs font-medium text-[var(--foreground-secondary)] mb-1">Liked by</div>
                          {project.votes.map((vote) => (
                            <div key={vote.user.id} className="text-sm text-[var(--foreground)]">{vote.user.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center hidden md:table-cell">
                    <div className="relative group inline-block">
                      <span className={`text-lg font-semibold cursor-default ${project._count.joins > 0 ? 'text-[var(--accent-emerald)]' : 'text-[var(--foreground-secondary)]'}`}>
                        {project._count.joins}
                      </span>
                      {project.joins.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          <div className="text-xs font-medium text-[var(--foreground-secondary)] mb-1">Joining</div>
                          {project.joins.map((join) => (
                            <div key={join.user.id} className="text-sm text-[var(--foreground)]">{join.user.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right hidden sm:table-cell">
                    <span className="text-sm text-gray-500">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </td>
                  {session && (
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {/* Like button */}
                        <button
                          onClick={() => project.hasVoted ? handleUnvote(project.id) : handleVote(project.id)}
                          className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            project.hasVoted
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-pink-500/10 hover:border-pink-500/30 hover:text-pink-300'
                          }`}
                          title={project.hasVoted ? 'Unlike' : 'Like this project'}
                        >
                          <svg 
                            className={`w-4 h-4 ${project.hasVoted ? 'fill-pink-400' : ''}`} 
                            fill={project.hasVoted ? 'currentColor' : 'none'} 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span className="hidden lg:inline">{project.hasVoted ? 'Liked' : 'Like'}</span>
                        </button>
                        
                        {/* Join button */}
                        <button
                          onClick={() => handleJoin(project.id)}
                          className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            project.hasJoined
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300'
                          }`}
                          title={project.hasJoined ? 'Leave project' : `Join this project (${userJoinCount}/2 joined)`}
                        >
                          <svg 
                            className="w-4 h-4" 
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
                          <span className="hidden lg:inline">{project.hasJoined ? 'Joined' : 'Join'}</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No results for filter */}
      {!loading && projects.length > 0 && sortedProjects.length === 0 && (
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

      {/* Join Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Maximum Projects Joined</h3>
            <p className="text-sm text-gray-400 mb-4">
              You can only join up to 2 projects. Choose one to leave in order to join the new one:
            </p>
            <div className="space-y-2 mb-6">
              {currentJoins.map((join) => (
                <button
                  key={join.projectId}
                  onClick={() => handleSwapJoin(join.projectId)}
                  disabled={swapping}
                  className="w-full text-left p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="text-white font-medium truncate">{join.projectName}</span>
                  <span className="text-xs text-gray-500 group-hover:text-red-400 transition-colors flex-shrink-0 ml-2">
                    {swapping ? 'Swapping...' : 'Leave & swap'}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowSwapModal(false)
                setSwapTargetProjectId(null)
                setCurrentJoins([])
              }}
              className="btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Submission Countdown Timer - bottom left */}
      {isSubmissionsOpen && appState?.submissionEndDate && (
        <SubmissionCountdown endDate={new Date(appState.submissionEndDate)} />
      )}
    </div>
  )
}

// Compact countdown component for bottom-left corner
function SubmissionCountdown({ endDate }: { endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft())

  function calcTimeLeft() {
    const diff = new Date(endDate).getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true }
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isOver: false,
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [endDate])

  if (timeLeft.isOver) return null

  const parts: string[] = []
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`)
  parts.push(`${String(timeLeft.hours).padStart(2, '0')}h`)
  parts.push(`${String(timeLeft.minutes).padStart(2, '0')}m`)
  parts.push(`${String(timeLeft.seconds).padStart(2, '0')}s`)

  return (
    <div className="fixed bottom-4 left-4 z-40 glass-card px-4 py-3 flex items-center gap-3 shadow-lg border border-white/10">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-gray-400">Submissions close in</span>
      </div>
      <span className="font-mono text-sm font-semibold text-white">
        {parts.join(' ')}
      </span>
    </div>
  )
}
