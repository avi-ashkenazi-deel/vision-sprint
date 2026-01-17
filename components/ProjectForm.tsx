'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, type ProjectType } from '@/types'
import { getInitials } from '@/lib/utils'

interface ProjectFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id: string
    name: string
    description: string
    pitchVideoUrl: string | null
    docLink: string | null
    projectType: ProjectType
    slackChannel: string
  }
  restrictedEdit?: boolean // When true, only slack and doc are editable
}

export function ProjectForm({ mode, initialData, restrictedEdit }: ProjectFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [pitchVideoUrl, setPitchVideoUrl] = useState(initialData?.pitchVideoUrl || '')
  const [docLink, setDocLink] = useState(initialData?.docLink || '')
  const [projectType, setProjectType] = useState<ProjectType>(
    initialData?.projectType || 'SMALL_FEATURE'
  )
  const [slackChannel, setSlackChannel] = useState(initialData?.slackChannel || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const body = restrictedEdit
        ? { slackChannel, docLink: docLink || null }
        : {
            name,
            description,
            pitchVideoUrl: pitchVideoUrl || null,
            docLink: docLink || null,
            projectType,
            slackChannel,
          }

      const url =
        mode === 'create' ? '/api/projects' : `/api/projects/${initialData?.id}`

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      const project = await res.json()
      router.push(`/projects/${project.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const projectTypes: ProjectType[] = ['MOONSHOT', 'SMALL_FEATURE', 'DELIGHT', 'EFFICIENCY']

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {/* Creator info (auto-filled) */}
      <div className="glass-card p-4">
        <label className="block text-sm text-gray-400 mb-2">Submitted by</label>
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || 'User'}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-medium">
              {getInitials(session?.user?.name)}
            </div>
          )}
          <div>
            <p className="font-medium text-white">{session?.user?.name}</p>
            <p className="text-sm text-gray-400">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      {/* Project name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
          Project Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={restrictedEdit}
          required={!restrictedEdit}
          placeholder="Enter a catchy name for your project"
          className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
          Description *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={restrictedEdit}
          required={!restrictedEdit}
          rows={4}
          placeholder="Describe your project idea, its goals, and potential impact"
          className="input-field resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Project type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Project Type *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {projectTypes.map((type) => (
            <button
              key={type}
              type="button"
              disabled={restrictedEdit}
              onClick={() => setProjectType(type)}
              className={`p-4 rounded-xl border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                projectType === type
                  ? `${PROJECT_TYPE_COLORS[type]} border-current`
                  : 'border-white/10 hover:border-white/20 text-gray-400'
              }`}
            >
              <span className="font-medium">{PROJECT_TYPE_LABELS[type]}</span>
              <p className="text-xs mt-1 opacity-70">
                {type === 'MOONSHOT' && 'Ambitious, game-changing ideas'}
                {type === 'SMALL_FEATURE' && 'Quick wins and improvements'}
                {type === 'DELIGHT' && 'User experience enhancements'}
                {type === 'EFFICIENCY' && 'Process and workflow optimizations'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Pitch video URL (optional) */}
      <div>
        <label htmlFor="pitchVideoUrl" className="block text-sm font-medium text-gray-300 mb-2">
          Pitch Video URL
          <span className="text-gray-500 ml-2">(optional)</span>
        </label>
        <input
          type="url"
          id="pitchVideoUrl"
          value={pitchVideoUrl}
          onChange={(e) => setPitchVideoUrl(e.target.value)}
          disabled={restrictedEdit}
          placeholder="https://www.youtube.com/watch?v=..."
          className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Doc/Figma link (optional) */}
      <div>
        <label htmlFor="docLink" className="block text-sm font-medium text-gray-300 mb-2">
          Document / Figma Link
          <span className="text-gray-500 ml-2">(optional)</span>
        </label>
        <input
          type="url"
          id="docLink"
          value={docLink}
          onChange={(e) => setDocLink(e.target.value)}
          placeholder="https://docs.google.com/... or https://figma.com/..."
          className="input-field"
        />
      </div>

      {/* Slack channel */}
      <div>
        <label htmlFor="slackChannel" className="block text-sm font-medium text-gray-300 mb-2">
          Slack Channel *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">#</span>
          <input
            type="text"
            id="slackChannel"
            value={slackChannel}
            onChange={(e) => setSlackChannel(e.target.value)}
            required
            placeholder="project-channel-name"
            className="input-field pl-7"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Where your team will communicate during the sprint
        </p>
      </div>

      {/* Submit button */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {mode === 'create' ? 'Creating...' : 'Saving...'}
            </>
          ) : mode === 'create' ? (
            'Create Project'
          ) : (
            'Save Changes'
          )}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
