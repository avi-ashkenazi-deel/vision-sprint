'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAppState } from '@/components/providers/AppStateProvider'
import { VideoPlayer } from '@/components/VideoPlayer'
import { ConfettiCelebration } from '@/components/ConfettiCelebration'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, REACTION_EMOJIS, type ProjectType, type ReactionType } from '@/types'
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
    projectType: ProjectType
  }
  members: TeamMember[]
  submission: {
    videoUrl: string
  } | null
}

interface ProjectReactions {
  counts: Record<ReactionType, number>
  userReactions: ReactionType[]
}

export default function ShowcasePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { appState, selectedSprintId, activeSprint } = useAppState()
  
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [watchedTeams, setWatchedTeams] = useState<string[]>([])
  const [reactions, setReactions] = useState<Record<string, ProjectReactions>>({})
  
  // Video player state
  const [selectedTeamIndex, setSelectedTeamIndex] = useState<number | null>(null)
  const [autoAdvance, setAutoAdvance] = useState(false)
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false)
  const [hasSeenCelebration, setHasSeenCelebration] = useState(false)

  useEffect(() => {
    // Redirect if not in showcase stage (unless test mode)
    if (appState && appState.stage !== 'SPRINT_OVER' && !appState.testMode) {
      router.push('/')
    }
  }, [appState, router])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const sprintParam = selectedSprintId ? `?sprintId=${selectedSprintId}` : ''
      const [teamsRes, watchedRes] = await Promise.all([
        fetch(`/api/teams${sprintParam}`),
        session ? fetch('/api/watched') : Promise.resolve(null),
      ])

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        // Filter to only teams with submissions
        const teamsWithSubmissions = teamsData.filter((t: Team) => t.submission)
        setTeams(teamsWithSubmissions)

        // Fetch reactions for each project
        const projectIds = [...new Set(teamsWithSubmissions.map((t: Team) => t.project.id))]
        const reactionsData: Record<string, ProjectReactions> = {}
        
        await Promise.all(
          projectIds.map(async (projectId) => {
            const res = await fetch(`/api/reactions?projectId=${projectId}`)
            if (res.ok) {
              const data = await res.json()
              reactionsData[projectId as string] = {
                counts: data.counts,
                userReactions: session?.user?.id
                  ? data.reactions
                      .filter((r: { userId: string }) => r.userId === session.user.id)
                      .map((r: { reactionType: ReactionType }) => r.reactionType)
                  : [],
              }
            }
          })
        )
        setReactions(reactionsData)
      }

      if (watchedRes?.ok) {
        const watchedData = await watchedRes.json()
        setWatchedTeams(watchedData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
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
        // Update local state
        setReactions((prev) => {
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

  const markAsWatched = useCallback(async (teamId: string) => {
    if (!session || watchedTeams.includes(teamId)) return

    try {
      await fetch('/api/watched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })

      setWatchedTeams((prev) => {
        const updated = [...prev, teamId]
        
        // Check if all videos watched
        if (updated.length === teams.length && !hasSeenCelebration) {
          setShowCelebration(true)
          setHasSeenCelebration(true)
        }
        
        return updated
      })
    } catch (error) {
      console.error('Failed to mark as watched:', error)
    }
  }, [session, watchedTeams, teams.length, hasSeenCelebration])

  const selectedTeam = selectedTeamIndex !== null ? teams[selectedTeamIndex] : null

  const handleVideoEnd = useCallback(() => {
    if (selectedTeam) {
      markAsWatched(selectedTeam.id)
    }

    if (autoAdvance && selectedTeamIndex !== null && selectedTeamIndex < teams.length - 1) {
      setSelectedTeamIndex(selectedTeamIndex + 1)
    }
  }, [selectedTeam, autoAdvance, selectedTeamIndex, teams.length, markAsWatched])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-10 bg-white/5 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-white/5 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const teamsWithSubmissions = teams.filter((t) => t.submission)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Project Showcase</h1>
          <p className="text-gray-400 mt-1">
            Watch the amazing projects and show your appreciation!
          </p>
        </div>

        {session && (
          <div className="text-right">
            <p className="text-sm text-gray-400">
              Watched {watchedTeams.length} of {teamsWithSubmissions.length} videos
            </p>
            <div className="w-48 h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                style={{
                  width: `${(watchedTeams.length / teamsWithSubmissions.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {teamsWithSubmissions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-400">No video submissions yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamsWithSubmissions.map((team, index) => {
            const projectReactions = reactions[team.project.id] || { counts: {}, userReactions: [] }
            const isWatched = watchedTeams.includes(team.id)

            return (
              <div
                key={team.id}
                className="glass-card glass-card-hover overflow-hidden cursor-pointer group"
                onClick={() => {
                  setSelectedTeamIndex(index)
                  markAsWatched(team.id)
                }}
              >
                {/* Thumbnail/Preview */}
                <div className="relative aspect-video bg-gradient-to-br from-purple-900/30 to-blue-900/30">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Watched indicator */}
                  {isWatched && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm">
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        Watched
                      </span>
                    </div>
                  )}

                  {/* Project type badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`badge text-xs ${PROJECT_TYPE_COLORS[team.project.projectType]}`}>
                      {PROJECT_TYPE_LABELS[team.project.projectType]}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                    {team.project.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">{team.teamName}</p>

                  {/* Team members */}
                  <div className="flex items-center gap-1 mb-4">
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

                  {/* Reactions preview */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                    {(['MEDAL', 'HEART', 'SHOCK', 'PARTY'] as ReactionType[]).map((type) => (
                      <span
                        key={type}
                        className={`text-sm ${
                          projectReactions.userReactions.includes(type)
                            ? 'opacity-100'
                            : 'opacity-50'
                        }`}
                      >
                        {REACTION_EMOJIS[type]} {projectReactions.counts[type] || 0}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedTeam && selectedTeam.submission && (
        <VideoPlayer
          videoUrl={selectedTeam.submission.videoUrl}
          teamName={selectedTeam.teamName}
          projectName={selectedTeam.project.name}
          members={selectedTeam.members}
          currentIndex={selectedTeamIndex!}
          totalCount={teamsWithSubmissions.length}
          reactions={reactions[selectedTeam.project.id]?.counts || {} as Record<ReactionType, number>}
          userReactions={reactions[selectedTeam.project.id]?.userReactions || []}
          onPrev={() => {
            if (selectedTeamIndex! > 0) {
              setSelectedTeamIndex(selectedTeamIndex! - 1)
              markAsWatched(teams[selectedTeamIndex! - 1].id)
            }
          }}
          onNext={() => {
            if (selectedTeamIndex! < teamsWithSubmissions.length - 1) {
              setSelectedTeamIndex(selectedTeamIndex! + 1)
              markAsWatched(teams[selectedTeamIndex! + 1].id)
            }
          }}
          onClose={() => setSelectedTeamIndex(null)}
          onReact={(type) => handleReact(selectedTeam.project.id, type)}
          onVideoEnd={handleVideoEnd}
          autoPlay={autoAdvance}
        />
      )}

      {/* Celebration */}
      {showCelebration && (
        <ConfettiCelebration onComplete={() => setShowCelebration(false)} />
      )}
    </div>
  )
}
