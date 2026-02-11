'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, VISION_AREA_COLORS, type ProjectType, type VisionWithDetails } from '@/types'
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
    businessRationale: string | null
    visionId: string | null
    department: string | null
  }
  restrictedEdit?: boolean // When true, only slack and doc are editable
}

export function ProjectForm({ mode, initialData, restrictedEdit }: ProjectFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visions, setVisions] = useState<VisionWithDetails[]>([])
  const [loadingVisions, setLoadingVisions] = useState(true)

  // Google Doc URL validation
  const isValidGoogleDocUrl = (url: string) => {
    return url.includes('docs.google.com/document')
  }

  // Google Drive video URL validation
  const isValidGoogleDriveVideoUrl = (url: string) => {
    if (!url) return false
    return url.includes('drive.google.com') || url.includes('docs.google.com/file')
  }

  // Convert Google Doc URL to embed URL
  const getGoogleDocEmbedUrl = (url: string) => {
    if (!url) return ''
    // Convert view/edit URL to embed URL
    // https://docs.google.com/document/d/DOC_ID/edit -> https://docs.google.com/document/d/DOC_ID/preview
    const match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://docs.google.com/document/d/${match[1]}/preview`
    }
    return ''
  }

  // Convert Google Drive URL to embed URL
  const getGoogleDriveEmbedUrl = (url: string) => {
    if (!url) return ''
    // Extract file ID from various Google Drive URL formats
    const match = url.match(/(?:drive\.google\.com\/file\/d\/|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/)
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`
    }
    return ''
  }

  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [pitchVideoUrl, setPitchVideoUrl] = useState(initialData?.pitchVideoUrl || '')
  const [docLink, setDocLink] = useState(initialData?.docLink || '')
  const [projectType, setProjectType] = useState<ProjectType>(
    initialData?.projectType || 'SMALL_FEATURE'
  )
  const [slackChannel, setSlackChannel] = useState(initialData?.slackChannel || 'VS26Q1-')
  const [businessRationale, setBusinessRationale] = useState(initialData?.businessRationale || '')
  const [visionId, setVisionId] = useState<string | null>(initialData?.visionId || null)
  const [department, setDepartment] = useState(initialData?.department || '')
  const [showSecurityNotice, setShowSecurityNotice] = useState(true)
  const [showCreateVision, setShowCreateVision] = useState(false)
  const [newVisionTitle, setNewVisionTitle] = useState('')
  const [newVisionArea, setNewVisionArea] = useState('')
  const [newVisionDocUrl, setNewVisionDocUrl] = useState('')
  const [creatingVision, setCreatingVision] = useState(false)
  const [createVisionError, setCreateVisionError] = useState('')
  const [docLinks, setDocLinks] = useState<string[]>(
    initialData?.docLink ? initialData.docLink.split(',').map(s => s.trim()).filter(Boolean) : ['']
  )

  // Fetch visions for the dropdown
  useEffect(() => {
    async function fetchVisions() {
      try {
        const res = await fetch('/api/visions')
        if (res.ok) {
          const data = await res.json()
          setVisions(data)
        }
      } catch (err) {
        console.error('Failed to fetch visions:', err)
      } finally {
        setLoadingVisions(false)
      }
    }
    fetchVisions()
  }, [])

  const handleCreateVision = async () => {
    if (!newVisionTitle.trim() || !newVisionArea.trim()) return
    setCreatingVision(true)
    setCreateVisionError('')
    try {
      const res = await fetch('/api/visions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newVisionTitle,
          area: newVisionArea,
          docUrl: newVisionDocUrl || null,
          description: '',
          kpis: '',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create vision')
      }
      const created = await res.json()
      // Refresh visions list and auto-select the new one
      const visionsRes = await fetch('/api/visions')
      if (visionsRes.ok) {
        const data = await visionsRes.json()
        setVisions(data)
      }
      setVisionId(created.id)
      setShowCreateVision(false)
      setNewVisionTitle('')
      setNewVisionArea('')
      setNewVisionDocUrl('')
    } catch (err) {
      setCreateVisionError(err instanceof Error ? err.message : 'Failed to create vision')
    } finally {
      setCreatingVision(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const body = restrictedEdit
        ? { slackChannel, docLink: docLinks.filter(l => l.trim()).join(', ') || null }
        : {
            name,
            description,
            pitchVideoUrl: pitchVideoUrl || null,
            docLink: docLinks.filter(l => l.trim()).join(', ') || null,
            projectType,
            slackChannel,
            businessRationale: businessRationale || null,
            visionId: visionId || null,
            department: department || null,
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
      {/* Security Warning Banner — dismissible */}
      {showSecurityNotice && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-400">Important Security Notice</p>
              <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
                Do not include any proprietary business logic, confidential code, or sensitive company information in your submissions. 
                Use your Google Doc for detailed descriptions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSecurityNotice(false)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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

      {/* ── Required Fields Section ── */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Required</h3>
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

        {/* Pitch Video - Google Drive (mandatory) */}
        <div>
          <label htmlFor="pitchVideoUrl" className="block text-sm font-medium text-gray-300 mb-2">
            Pitch Video (Google Drive) *
          </label>
          <input
            type="url"
            id="pitchVideoUrl"
            value={pitchVideoUrl}
            onChange={(e) => setPitchVideoUrl(e.target.value)}
            disabled={restrictedEdit}
            required={!restrictedEdit}
            placeholder="https://drive.google.com/file/d/..."
            className={`input-field disabled:opacity-50 disabled:cursor-not-allowed ${
              pitchVideoUrl && !isValidGoogleDriveVideoUrl(pitchVideoUrl) ? 'border-red-500/50' : ''
            }`}
          />
          {pitchVideoUrl && !isValidGoogleDriveVideoUrl(pitchVideoUrl) && (
            <p className="text-xs text-red-400 mt-2">
              Please use a Google Drive video link. YouTube links are not allowed for security reasons.
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Upload your pitch video to Google Drive (max 4 minutes), set it to &quot;Anyone with the link can view&quot;, and paste the link here.
          </p>
          
          {/* Google Drive Video Preview */}
          {pitchVideoUrl && isValidGoogleDriveVideoUrl(pitchVideoUrl) && getGoogleDriveEmbedUrl(pitchVideoUrl) && (
            <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
              <div className="bg-white/5 px-3 py-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Video Preview</span>
                <a 
                  href={pitchVideoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Open in new tab
                </a>
              </div>
              <iframe
                src={getGoogleDriveEmbedUrl(pitchVideoUrl)}
                width="100%"
                height="300"
                className="bg-black"
                title="Video Preview"
                allow="autoplay"
              />
            </div>
          )}
        </div>

        {/* Description - Google Doc URL */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Project Description (Google Doc URL) *
          </label>
          <input
            type="url"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={restrictedEdit}
            required={!restrictedEdit}
            placeholder="https://docs.google.com/document/d/..."
            className={`input-field disabled:opacity-50 disabled:cursor-not-allowed ${
              description && !isValidGoogleDocUrl(description) ? 'border-red-500/50' : ''
            }`}
          />
          {description && !isValidGoogleDocUrl(description) && (
            <p className="text-xs text-red-400 mt-2">
              Please enter a valid Google Docs URL (e.g., https://docs.google.com/document/d/...)
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Use our <a href="https://docs.google.com/document/d/1MC50GSMPplfOdYrv90hSu5Ugn3nPqZNTh0dk2ZU8bv0/copy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">description template</a> to create your doc, then paste the shareable link here. Make sure the doc is set to &quot;Anyone with the link can view&quot;.
          </p>
          
          {/* Google Doc Preview */}
          {description && isValidGoogleDocUrl(description) && (
            <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
              <div className="bg-white/5 px-3 py-2 text-xs text-gray-400 flex items-center justify-between">
                <span>Document Preview</span>
                <a 
                  href={description} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Open in new tab
                </a>
              </div>
              <iframe
                src={getGoogleDocEmbedUrl(description)}
                width="100%"
                height="400"
                className="bg-white"
                title="Google Doc Preview"
              />
            </div>
          )}
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
              onChange={(e) => setSlackChannel(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              required
              placeholder="VS26Q1-your-project-name"
              className="input-field pl-7"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Naming convention: VS26Q1-your-project-name
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Allows people to contact you about your project now and in the future.
          </p>
        </div>
      </div>

      {/* ── Optional Fields Section ── */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Optional</h3>
        </div>

        {/* Vertical / Team — fed from visions' areas */}
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-300 mb-2">
            Vertical / Team
          </label>
          <input
            type="text"
            id="department"
            list="vertical-options"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            disabled={restrictedEdit}
            placeholder="Select or type a vertical / team..."
            className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <datalist id="vertical-options">
            {[...new Set(visions.map(v => v.area).filter(Boolean))]
              .sort((a, b) => a.localeCompare(b))
              .map((area) => (
                <option key={area} value={area} />
              ))}
          </datalist>
          <p className="text-xs text-gray-500 mt-2">
            Select an existing vertical from Visions or type a new one.
          </p>
        </div>

        {/* Related Vision */}
        <div>
          <label htmlFor="visionId" className="block text-sm font-medium text-gray-300 mb-2">
            Related Vision / KPI
          </label>
          <div className="flex gap-2">
            <select
              id="visionId"
              value={visionId || ''}
              onChange={(e) => setVisionId(e.target.value || null)}
              disabled={restrictedEdit}
              className="input-field flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a vision to align with...</option>
              {loadingVisions ? (
                <option disabled>Loading visions...</option>
              ) : (
                visions.map((vision) => (
                  <option key={vision.id} value={vision.id}>
                    [{vision.area}] {vision.title}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => setShowCreateVision(true)}
              disabled={restrictedEdit}
              className="btn-secondary text-sm whitespace-nowrap flex items-center gap-1 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Vision
            </button>
          </div>
          {visionId && visions.find(v => v.id === visionId) && (
            <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <span className={`badge text-xs ${VISION_AREA_COLORS[visions.find(v => v.id === visionId)?.area || 'Other']}`}>
                  {visions.find(v => v.id === visionId)?.area}
                </span>
                <span className="font-medium text-sm">{visions.find(v => v.id === visionId)?.title}</span>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Link your project to a company vision or KPI to help others understand its strategic alignment.
          </p>

          {/* Inline Create Vision Modal */}
          {showCreateVision && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="glass-card p-6 w-full max-w-md relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateVision(false)
                    setCreateVisionError('')
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <h3 className="text-lg font-semibold text-white mb-4">Create New Vision</h3>

                {createVisionError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                    {createVisionError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                    <input
                      type="text"
                      value={newVisionTitle}
                      onChange={(e) => setNewVisionTitle(e.target.value)}
                      placeholder="e.g., Improve Customer Retention by 20%"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Vertical / Team *</label>
                    <input
                      type="text"
                      list="new-vision-area-options"
                      value={newVisionArea}
                      onChange={(e) => setNewVisionArea(e.target.value)}
                      placeholder="e.g., Growth, Engineering, Sales..."
                      className="input-field"
                    />
                    <datalist id="new-vision-area-options">
                      {[...new Set(visions.map(v => v.area).filter(Boolean))]
                        .sort((a, b) => a.localeCompare(b))
                        .map((area) => (
                          <option key={area} value={area} />
                        ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Document URL</label>
                    <input
                      type="url"
                      value={newVisionDocUrl}
                      onChange={(e) => setNewVisionDocUrl(e.target.value)}
                      placeholder="https://docs.google.com/..."
                      className="input-field"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCreateVision}
                      disabled={creatingVision || !newVisionTitle.trim() || !newVisionArea.trim()}
                      className="btn-primary disabled:opacity-50"
                    >
                      {creatingVision ? 'Creating...' : 'Create & Select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateVision(false)
                        setCreateVisionError('')
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Doc/Figma links — multiple */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Documents / Figma Links
          </label>
          <div className="space-y-2">
            {docLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => {
                    const updated = [...docLinks]
                    updated[idx] = e.target.value
                    setDocLinks(updated)
                  }}
                  placeholder="https://docs.google.com/... or https://figma.com/..."
                  className="input-field flex-1"
                />
                {docLinks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDocLinks(docLinks.filter((_, i) => i !== idx))}
                    className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                    title="Remove link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDocLinks([...docLinks, ''])}
            className="mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add another link
          </button>
        </div>
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
