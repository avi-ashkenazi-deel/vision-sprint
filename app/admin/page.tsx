'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/components/providers/AppStateProvider'
import Image from 'next/image'
import { PROJECT_TYPE_LABELS, DISCIPLINE_LABELS, DISCIPLINE_COLORS, type ProjectType, type Discipline } from '@/types'
import { getInitials } from '@/lib/utils'

type AppStage = 'RECEIVING_SUBMISSIONS' | 'EXECUTING_SPRINT' | 'SPRINT_OVER'

const MAX_DESIGNERS_PER_TEAM = 3

interface Project {
  id: string
  name: string
  projectType: ProjectType
  _count: { votes: number; joins: number }
  joins: {
    user: { id: string; name: string | null; image: string | null }
  }[]
  teams: {
    id: string
    teamName: string
    teamNumber: number
    members: { user: { id: string; name: string | null; image: string | null } }[]
  }[]
}

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

const TEAM_SIZE = 3

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { appState, refreshAppState } = useAppState()
  
  const [stage, setStage] = useState<AppStage>('RECEIVING_SUBMISSIONS')
  const [testMode, setTestMode] = useState(false)
  const [submissionEndDate, setSubmissionEndDate] = useState('')
  const [sprintStartDate, setSprintStartDate] = useState('')
  const [sprintEndDate, setSprintEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Team formation state
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/')
    }
  }, [status, session, router])

  useEffect(() => {
    if (appState) {
      setStage(appState.stage as AppStage)
      setTestMode(appState.testMode)
      if (appState.submissionEndDate) {
        setSubmissionEndDate(new Date(appState.submissionEndDate).toISOString().slice(0, 16))
      }
      if (appState.sprintStartDate) {
        setSprintStartDate(new Date(appState.sprintStartDate).toISOString().slice(0, 16))
      }
      if (appState.sprintEndDate) {
        setSprintEndDate(new Date(appState.sprintEndDate).toISOString().slice(0, 16))
      }
    }
  }, [appState])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/admin/users'),
      ])

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        setProjects(projectsData.sort((a: Project, b: Project) => b._count.votes - a._count.votes))
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  // Filter projects that don't have a complete team (3 members)
  const availableProjects = useMemo(() => {
    return projects.filter(project => {
      // A project is available if it has no teams, or no team has reached TEAM_SIZE members
      if (project.teams.length === 0) return true
      // Check if all teams are full
      const allTeamsFull = project.teams.every(team => team.members.length >= TEAM_SIZE)
      return !allTeamsFull
    })
  }, [projects])

  // Get users already assigned to ANY team (across all projects)
  const assignedUserIds = useMemo(() => {
    const ids = new Set<string>()
    projects.forEach(project => {
      project.teams.forEach(team => {
        team.members.forEach(member => {
          ids.add(member.user.id)
        })
      })
    })
    return ids
  }, [projects])

  // Get user IDs who want to join the selected project
  const joinedUserIds = useMemo(() => {
    if (!selectedProject) return new Set<string>()
    const project = projects.find(p => p.id === selectedProject)
    if (!project) return new Set<string>()
    return new Set(project.joins.map(j => j.user.id))
  }, [selectedProject, projects])

  // Available users (not already assigned to any team), sorted with joiners first
  const availableUsers = useMemo(() => {
    const filtered = users.filter(user => !assignedUserIds.has(user.id))
    // Sort: users who joined the selected project come first
    return filtered.sort((a, b) => {
      const aJoined = joinedUserIds.has(a.id) ? 1 : 0
      const bJoined = joinedUserIds.has(b.id) ? 1 : 0
      return bJoined - aJoined // Descending so joined users come first
    })
  }, [users, assignedUserIds, joinedUserIds])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          testMode,
          submissionEndDate: submissionEndDate ? new Date(submissionEndDate).toISOString() : null,
          sprintStartDate: sprintStartDate ? new Date(sprintStartDate).toISOString() : null,
          sprintEndDate: sprintEndDate ? new Date(sprintEndDate).toISOString() : null,
        }),
      })

      if (res.ok) {
        await refreshAppState()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTeam = async () => {
    // Validate inputs
    if (!selectedProject) {
      setTeamError('Please select a project')
      return
    }
    if (teamMembers.length !== TEAM_SIZE) {
      setTeamError(`Please select exactly ${TEAM_SIZE} members`)
      return
    }

    // Get project name for team name
    const project = projects.find(p => p.id === selectedProject)
    if (!project) {
      setTeamError('Project not found')
      return
    }

    // Generate team name: "Project Name" or "Project Name (Team 2)" if there's already a team
    const existingTeamsCount = project.teams.length
    const teamName = existingTeamsCount > 0 
      ? `${project.name} (Team ${existingTeamsCount + 1})`
      : project.name

    setCreatingTeam(true)
    setTeamError(null)
    
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          teamName,
          memberIds: teamMembers,
        }),
      })

      if (res.ok) {
        setTeamMembers([])
        setSelectedProject(null)
        setTeamError(null)
        fetchData()
      } else {
        const data = await res.json()
        setTeamError(data.error || 'Failed to create team')
      }
    } catch (error) {
      console.error('Failed to create team:', error)
      setTeamError('Failed to create team. Please try again.')
    } finally {
      setCreatingTeam(false)
    }
  }

  const handleDuplicateProject = async (projectId: string) => {
    try {
      const res = await fetch('/api/admin/duplicate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to duplicate project:', error)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete team:', error)
    }
  }

  // Helper to get team status for a project
  const getProjectTeamStatus = (project: Project) => {
    if (project.teams.length === 0) return { status: 'no-team', label: 'No team assigned', color: 'text-gray-400' }
    
    const totalMembers = project.teams.reduce((sum, team) => sum + team.members.length, 0)
    const hasFullTeam = project.teams.some(team => team.members.length >= TEAM_SIZE)
    
    if (hasFullTeam) {
      return { status: 'complete', label: `${totalMembers} members (complete)`, color: 'text-emerald-400' }
    }
    return { status: 'partial', label: `${totalMembers} members (incomplete)`, color: 'text-amber-400' }
  }

  if (status === 'loading' || !session?.user?.isAdmin) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-10 bg-white/5 rounded w-48 mb-8"></div>
          <div className="glass-card p-6 space-y-4">
            <div className="h-8 bg-white/5 rounded w-full"></div>
            <div className="h-8 bg-white/5 rounded w-full"></div>
          </div>
        </div>
      </div>
    )
  }

  const [themeOverride, setThemeOverride] = useState<'system' | 'light' | 'dark'>('system')

  const toggleTheme = () => {
    const html = document.documentElement
    if (themeOverride === 'system' || themeOverride === 'dark') {
      // Switch to light
      html.classList.remove('dark')
      html.classList.add('light')
      html.style.colorScheme = 'light'
      setThemeOverride('light')
    } else {
      // Switch to dark
      html.classList.remove('light')
      html.classList.add('dark')
      html.style.colorScheme = 'dark'
      setThemeOverride('dark')
    }
  }

  const resetTheme = () => {
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    html.style.colorScheme = ''
    setThemeOverride('system')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm text-gray-300 hover:bg-white/15 hover:text-white transition-colors"
          >
            {themeOverride === 'light' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {themeOverride === 'system' ? 'Switch to Light' : themeOverride === 'light' ? 'Switch to Dark' : 'Switch to Light'}
          </button>
          {themeOverride !== 'system' && (
            <button
              type="button"
              onClick={resetTheme}
              className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset to System
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stage Controls */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-6">Stage Controls</h2>

          {/* Stage selector */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-gray-300">Current Stage</label>
            <div className="space-y-2">
              {(['RECEIVING_SUBMISSIONS', 'EXECUTING_SPRINT', 'SPRINT_OVER'] as AppStage[]).map((s) => (
                <label
                  key={s}
                  className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                    stage === s
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="stage"
                    value={s}
                    checked={stage === s}
                    onChange={() => setStage(s)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    stage === s ? 'border-purple-500 bg-purple-500' : 'border-gray-500'
                  }`}>
                    {stage === s && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {s === 'RECEIVING_SUBMISSIONS' && 'Receiving Submissions'}
                      {s === 'EXECUTING_SPRINT' && 'Executing Sprint'}
                      {s === 'SPRINT_OVER' && 'Sprint Over'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {s === 'RECEIVING_SUBMISSIONS' && 'Users can submit and vote on projects'}
                      {s === 'EXECUTING_SPRINT' && 'Teams work on projects, limited editing'}
                      {s === 'SPRINT_OVER' && 'Showcase mode, video viewing and reactions'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Submissions Deadline
              </label>
              <input
                type="datetime-local"
                value={submissionEndDate}
                onChange={(e) => setSubmissionEndDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sprint Start
              </label>
              <input
                type="datetime-local"
                value={sprintStartDate}
                onChange={(e) => setSprintStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sprint End
              </label>
              <input
                type="datetime-local"
                value={sprintEndDate}
                onChange={(e) => setSprintEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Test mode toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-6">
            <div>
              <p className="font-medium text-amber-300">Test Mode</p>
              <p className="text-sm text-amber-400/70">
                Bypass stage restrictions for testing
              </p>
            </div>
            <button
              onClick={() => setTestMode(!testMode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                testMode ? 'bg-amber-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  testMode ? 'left-7' : 'left-1'
                }`}
              ></div>
            </button>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Team Formation */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-6">Team Formation</h2>

          {loadingData ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded"></div>
              ))}
            </div>
          ) : (
            <>
              {/* Error message */}
              {teamError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {teamError}
                </div>
              )}

              {/* Project selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Project
                  <span className="text-gray-500 ml-2">
                    ({availableProjects.length} available)
                  </span>
                </label>
                {availableProjects.length === 0 ? (
                  <div className="p-4 rounded-lg bg-white/5 text-gray-400 text-sm">
                    All projects have complete teams. Duplicate a project below to add another team.
                  </div>
                ) : (
                  <select
                    value={selectedProject || ''}
                    onChange={(e) => {
                      const projectId = e.target.value || null
                      setSelectedProject(projectId)
                      setTeamError(null)
                      
                      // Pre-select users who joined this project (up to TEAM_SIZE)
                      if (projectId) {
                        const project = projects.find(p => p.id === projectId)
                        if (project) {
                          const joinedAvailableUsers = project.joins
                            .map(j => j.user.id)
                            .filter(id => !assignedUserIds.has(id))
                            .slice(0, TEAM_SIZE)
                          setTeamMembers(joinedAvailableUsers)
                        } else {
                          setTeamMembers([])
                        }
                      } else {
                        setTeamMembers([])
                      }
                    }}
                    className="input-field"
                  >
                    <option value="">Choose a project...</option>
                    {availableProjects.map((project) => {
                      const joinCount = project._count.joins
                      return (
                        <option key={project.id} value={project.id}>
                          {project.name} ({project._count.votes} likes{joinCount > 0 ? `, ${joinCount} joining` : ''}) - {PROJECT_TYPE_LABELS[project.projectType]}
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>

              {/* Member selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Members
                  <span className={`ml-2 ${teamMembers.length === TEAM_SIZE ? 'text-emerald-400' : 'text-gray-500'}`}>
                    ({teamMembers.length}/{TEAM_SIZE} selected)
                  </span>
                </label>
                {selectedProject && joinedUserIds.size > 0 && (
                  <div className="mb-2 text-xs text-emerald-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Users who want to join are highlighted and pre-selected
                  </div>
                )}
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 rounded-lg bg-white/5">
                  {availableUsers.length === 0 ? (
                    <p className="text-gray-500 text-sm p-2">
                      {selectedProject 
                        ? 'All users are assigned to projects'
                        : 'Select a project first'}
                    </p>
                  ) : (
                    availableUsers.map((user) => {
                      const wantsToJoin = joinedUserIds.has(user.id)
                      return (
                        <label
                          key={user.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            teamMembers.includes(user.id)
                              ? wantsToJoin ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-purple-500/20'
                              : teamMembers.length >= TEAM_SIZE
                              ? 'opacity-50 cursor-not-allowed'
                              : wantsToJoin ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-white/5'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={teamMembers.includes(user.id)}
                            disabled={!teamMembers.includes(user.id) && teamMembers.length >= TEAM_SIZE}
                            onChange={(e) => {
                              setTeamError(null)
                              if (e.target.checked && teamMembers.length < TEAM_SIZE) {
                                setTeamMembers([...teamMembers, user.id])
                              } else if (!e.target.checked) {
                                setTeamMembers(teamMembers.filter((id) => id !== user.id))
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            teamMembers.includes(user.id)
                              ? wantsToJoin ? 'border-emerald-500 bg-emerald-500' : 'border-purple-500 bg-purple-500'
                              : wantsToJoin ? 'border-emerald-500' : 'border-gray-500'
                          }`}>
                            {teamMembers.includes(user.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name || ''}
                              width={24}
                              height={24}
                              className={`rounded-full ${wantsToJoin ? 'ring-2 ring-emerald-500' : ''}`}
                            />
                          ) : (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              wantsToJoin 
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 ring-2 ring-emerald-500' 
                                : 'bg-gradient-to-br from-purple-500 to-blue-500'
                            }`}>
                              {getInitials(user.name)}
                            </div>
                          )}
                          <span className="text-sm flex-1">{user.name || user.email}</span>
                          {wantsToJoin && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              wants to join
                            </span>
                          )}
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateTeam}
                disabled={!selectedProject || teamMembers.length !== TEAM_SIZE || creatingTeam}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingTeam ? 'Creating...' : 
                  !selectedProject ? 'Select a project first' :
                  teamMembers.length !== TEAM_SIZE ? `Select ${TEAM_SIZE - teamMembers.length} more member${TEAM_SIZE - teamMembers.length !== 1 ? 's' : ''}` :
                  'Create Team'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Projects with Teams */}
      <div className="mt-8 glass-card p-6">
        <h2 className="text-xl font-semibold mb-6">Projects & Teams</h2>

        {loadingData ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded"></div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No projects yet</p>
        ) : (
          <div className="space-y-4">
            {projects.map((project, index) => {
              const teamStatus = getProjectTeamStatus(project)
              const hasCompleteTeam = project.teams.some(team => team.members.length >= TEAM_SIZE)
              
              return (
                <div key={project.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-gray-400">
                          {PROJECT_TYPE_LABELS[project.projectType]} • {project._count.votes} likes
                          {project._count.joins > 0 && (
                            <span className="text-emerald-400"> • {project._count.joins} joining</span>
                          )}
                          {' '} • <span className={teamStatus.color}>{teamStatus.label}</span>
                        </p>
                      </div>
                    </div>
                    {hasCompleteTeam && (
                      <button
                        onClick={() => handleDuplicateProject(project.id)}
                        className="btn-secondary text-sm px-3 py-1"
                        title="Duplicate to assign another team"
                      >
                        + Add Another Team
                      </button>
                    )}
                  </div>

                  {project.teams.length > 0 ? (
                    <div className="space-y-2 mt-3 pt-3 border-t border-white/10">
                      {project.teams.map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-2 rounded bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-purple-400">
                              {team.teamName}
                            </span>
                            <span className={`text-xs ${team.members.length >= TEAM_SIZE ? 'text-emerald-400' : 'text-amber-400'}`}>
                              ({team.members.length}/{TEAM_SIZE})
                            </span>
                            <div className="flex items-center gap-1">
                              {team.members.map((member) => (
                                member.user.image ? (
                                  <Image
                                    key={member.user.id}
                                    src={member.user.image}
                                    alt={member.user.name || ''}
                                    width={20}
                                    height={20}
                                    className="rounded-full"
                                    title={member.user.name || ''}
                                  />
                                ) : (
                                  <div
                                    key={member.user.id}
                                    className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-[10px]"
                                    title={member.user.name || ''}
                                  >
                                    {getInitials(member.user.name)}
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">No teams assigned yet</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
