'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAppState } from '@/components/providers/AppStateProvider'
import { Timer } from '@/components/Timer'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, type ProjectType } from '@/types'
import { getInitials } from '@/lib/utils'

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

export default function SprintPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { appState } = useAppState()
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  
  // Submission state
  const [submittingTeamId, setSubmittingTeamId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Redirect if not in sprint stage
    if (appState && appState.stage !== 'EXECUTING_SPRINT' && !appState.testMode) {
      router.push('/')
    }
  }, [appState, router])

  useEffect(() => {
    fetchTeams()
  }, [session])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setAllTeams(data)
        
        // Filter to find user's teams
        if (session?.user?.id) {
          const userTeams = data.filter((team: Team) =>
            team.members.some((member: TeamMember) => member.user.id === session.user.id)
          )
          setMyTeams(userTeams)
        }
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-32 bg-white/5 rounded-lg mb-8"></div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-white/5 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
                    <div className="flex items-center gap-2 mb-4">
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
                    <div className="flex items-center gap-4">
                      <a
                        href={`https://slack.com/app_redirect?channel=${team.project.slackChannel}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
                        </svg>
                        #{team.project.slackChannel}
                      </a>
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
                          Documents
                        </a>
                      )}
                      <Link
                        href={`/projects/${team.project.id}/edit`}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Links
                      </Link>
                    </div>
                  </div>

                  {/* Submission section */}
                  <div className="lg:w-80">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <h4 className="font-medium mb-3">Video Submission</h4>
                      
                      {team.submission ? (
                        <div>
                          <div className="flex items-center gap-2 text-emerald-400 mb-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm">Video submitted!</span>
                          </div>
                          <a
                            href={team.submission.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-400 hover:text-purple-300 break-all"
                          >
                            {team.submission.videoUrl}
                          </a>
                          <button
                            onClick={() => {
                              setSubmittingTeamId(team.id)
                              setVideoUrl(team.submission?.videoUrl || '')
                            }}
                            className="mt-3 text-sm text-gray-400 hover:text-white"
                          >
                            Update video
                          </button>
                        </div>
                      ) : submittingTeamId === team.id ? (
                        <div className="space-y-3">
                          <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Google Drive video link"
                            className="input-field text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSubmitVideo(team.id)}
                              disabled={!videoUrl || submitting}
                              className="btn-primary text-sm flex-1"
                            >
                              {submitting ? 'Submitting...' : 'Submit'}
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
