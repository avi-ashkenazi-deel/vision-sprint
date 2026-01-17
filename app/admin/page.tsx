'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/components/providers/AppStateProvider'
import Image from 'next/image'
import { PROJECT_TYPE_LABELS, type ProjectType } from '@/types'
import { getInitials } from '@/lib/utils'

type AppStage = 'RECEIVING_SUBMISSIONS' | 'EXECUTING_SPRINT' | 'SPRINT_OVER'

interface Project {
  id: string
  name: string
  projectType: ProjectType
  _count: { votes: number }
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

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { appState, refreshAppState } = useAppState()
  
  const [stage, setStage] = useState<AppStage>('RECEIVING_SUBMISSIONS')
  const [testMode, setTestMode] = useState(false)
  const [sprintStartDate, setSprintStartDate] = useState('')
  const [sprintEndDate, setSprintEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Team formation state
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [teamName, setTeamName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

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

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          testMode,
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
    if (!selectedProject || teamMembers.length === 0 || !teamName) return

    setCreatingTeam(true)
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
        setTeamName('')
        setSelectedProject(null)
        fetchData()
      }
    } catch (error) {
      console.error('Failed to create team:', error)
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

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

          {/* Sprint dates */}
          <div className="grid grid-cols-2 gap-4 mb-6">
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
              {/* Project selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  className="input-field"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project._count.votes} votes) - {PROJECT_TYPE_LABELS[project.projectType]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Team Alpha"
                  className="input-field"
                />
              </div>

              {/* Member selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Members (select 3)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 rounded-lg bg-white/5">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        teamMembers.includes(user.id)
                          ? 'bg-purple-500/20'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={teamMembers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTeamMembers([...teamMembers, user.id])
                          } else {
                            setTeamMembers(teamMembers.filter((id) => id !== user.id))
                          }
                        }}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        teamMembers.includes(user.id)
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-500'
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
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs">
                          {getInitials(user.name)}
                        </div>
                      )}
                      <span className="text-sm">{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateTeam}
                disabled={!selectedProject || teamMembers.length === 0 || !teamName || creatingTeam}
                className="btn-primary w-full disabled:opacity-50"
              >
                {creatingTeam ? 'Creating...' : 'Create Team'}
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
            {projects.map((project, index) => (
              <div key={project.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-sm text-gray-400">
                        {PROJECT_TYPE_LABELS[project.projectType]} • {project._count.votes} votes
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDuplicateProject(project.id)}
                    className="btn-secondary text-sm px-3 py-1"
                    title="Duplicate for second team"
                  >
                    Duplicate
                  </button>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
