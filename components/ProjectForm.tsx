'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, VISION_AREA_COLORS, type ProjectType, type VisionWithDetails } from '@/types'
import { getInitials } from '@/lib/utils'

type TransitionPhase = 'editing' | 'wipe-in' | 'wipe-out' | 'created' | 'fading-out'

const COUNTDOWN_SECONDS = 4

interface CreatedProject {
  id: string
  name: string
  projectType: ProjectType
}

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

  // --- Celebration transition state ---
  const [phase, setPhase] = useState<TransitionPhase>('editing')
  const [createdProject, setCreatedProject] = useState<CreatedProject | null>(null)

  // Countdown timer for auto-redirect
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Logo-branded confetti burst
  const fireConfetti = useCallback(() => {
    const colors = ['#FDCD2A', '#C46BF5', '#9ED9FF', '#FFC511', '#a78bfa']

    // Left cannon
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, startVelocity: 45 })
    // Right cannon
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, startVelocity: 45 })
    // Center burst (delayed)
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 90, origin: { x: 0.5, y: 0.5 }, colors, startVelocity: 35 })
    }, 300)
  }, [])

  // Start countdown when created phase begins
  useEffect(() => {
    if (phase === 'created') {
      setCountdown(COUNTDOWN_SECONDS)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [phase])

  // When countdown hits 0, fade out then navigate to project list
  useEffect(() => {
    if (countdown === 0 && phase === 'created') {
      setPhase('fading-out')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 500)
    }
  }, [countdown, phase, router])

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
  const [videoCheckLoading, setVideoCheckLoading] = useState(false)
  const [videoCheckResult, setVideoCheckResult] = useState<{ valid: boolean; error?: string; durationFormatted?: string; warning?: string } | null>(null)

  // Auto-check video duration when URL changes (debounced)
  useEffect(() => {
    if (!pitchVideoUrl || !isValidGoogleDriveVideoUrl(pitchVideoUrl)) {
      setVideoCheckResult(null)
      return
    }

    const timer = setTimeout(async () => {
      setVideoCheckLoading(true)
      setVideoCheckResult(null)
      try {
        const res = await fetch('/api/projects/check-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: pitchVideoUrl }),
        })
        const data = await res.json()
        setVideoCheckResult(data)
      } catch {
        setVideoCheckResult({ valid: false, error: 'Failed to check video duration' })
      } finally {
        setVideoCheckLoading(false)
      }
    }, 800) // 800ms debounce

    return () => clearTimeout(timer)
  }, [pitchVideoUrl])

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

      // For create mode: run the chevron wipe celebration
      if (mode === 'create') {
        setCreatedProject({ id: project.id, name: project.name, projectType: project.projectType })
        setPhase('wipe-in')

        // After wipe-in covers screen, swap to wipe-out to reveal success
        setTimeout(() => {
          setPhase('wipe-out')
          // Fire confetti as the wipe reveals the success view
          setTimeout(() => fireConfetti(), 200)
        }, 750)

        // Mark phase as fully created after wipe-out finishes
        setTimeout(() => {
          setPhase('created')
        }, 1500)
      } else {
        // Edit mode: normal navigation
        router.push(`/projects/${project.id}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const projectTypes: ProjectType[] = ['MOONSHOT', 'SMALL_FEATURE', 'DELIGHT', 'EFFICIENCY']

  // --- Success view (project created) ---
  if (phase !== 'editing') {
    return (
      <div className="relative">
        {/* ── Chevron wipe overlay ── */}
        {(phase === 'wipe-in' || phase === 'wipe-out') && (
          <div
            className={`fixed inset-0 z-50 ${phase === 'wipe-in' ? 'chevron-wipe-in' : 'chevron-wipe-out'}`}
            style={{
              background: 'linear-gradient(135deg, #FDCD2A 0%, #FFC511 40%, #C46BF5 100%)',
            }}
          >
            {/* Logo centered during wipe — slides up from bottom */}
            {phase === 'wipe-in' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/logo.svg"
                  alt="VisionSprint"
                  className="w-[40vw] max-w-[600px] h-auto object-contain opacity-0 animate-logoSlideUp"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Success content (visible once wipe-out starts revealing) ── */}
        <div className={`${phase === 'wipe-in' ? 'opacity-0' : ''} ${phase === 'fading-out' ? 'animate-fadeOutDown' : ''}`}>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            {/* Animated check circle */}
            <div className="mb-8 animate-pulseGlow rounded-full">
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="drop-shadow-lg">
                <circle
                  cx="48" cy="48" r="44"
                  stroke="#FDCD2A" strokeWidth="4" fill="none"
                  className="animate-circleDraw"
                />
                <path
                  d="M30 50 L42 62 L66 36"
                  stroke="#FDCD2A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"
                  className="animate-checkDraw"
                />
              </svg>
            </div>

            {/* Project name + details */}
            <div className="text-center animate-successSlideUp" style={{ animationDelay: '0.2s', opacity: 0 }}>
              <p className="text-sm font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--foreground-secondary)' }}>
                Project Created
              </p>
              <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                {createdProject?.name}
              </h2>
              {createdProject?.projectType && (
                <span className={`badge text-sm ${PROJECT_TYPE_COLORS[createdProject.projectType]}`}>
                  {PROJECT_TYPE_LABELS[createdProject.projectType]}
                </span>
              )}
            </div>

            {/* Creator info */}
            <div className="mt-8 animate-successSlideUp" style={{ animationDelay: '0.4s', opacity: 0 }}>
              <div className="glass-card p-4 flex items-center gap-3">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-medium text-white">
                    {getInitials(session?.user?.name)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {session?.user?.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                    Submitted just now
                  </p>
                </div>
              </div>
            </div>

            {/* Countdown timer + auto-redirect */}
            <div className="mt-10 flex flex-col items-center gap-4 animate-successSlideUp" style={{ animationDelay: '0.6s', opacity: 0 }}>
              {/* Circular countdown ring */}
              <div className="relative w-14 h-14">
                <svg width="56" height="56" viewBox="0 0 56 56" className="rotate-[-90deg]">
                  <circle
                    cx="28" cy="28" r="24"
                    stroke="var(--card-border)" strokeWidth="3" fill="none"
                  />
                  <circle
                    cx="28" cy="28" r="24"
                    stroke="#FDCD2A" strokeWidth="3" fill="none"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 150.8,
                      strokeDashoffset: 0,
                      animation: `countdownRing ${COUNTDOWN_SECONDS}s linear forwards`,
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                    {countdown}
                  </span>
                </div>
              </div>

              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Redirecting to projects...
              </p>

              <button
                onClick={() => {
                  if (countdownRef.current) clearInterval(countdownRef.current)
                  router.push(`/projects/${createdProject?.id}`)
                  router.refresh()
                }}
                className="btn-secondary text-sm px-4 py-2 mt-2"
              >
                View project now
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Security Warning Banner — dismissible */}
      {showSecurityNotice && (
        <div className="p-4 rounded-lg" style={{ background: 'var(--badge-amber-bg)', border: '1px solid var(--accent-amber)' }}>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--badge-amber-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--badge-amber-text)' }}>Important Security Notice</p>
              <p className="text-sm mt-1" style={{ color: 'var(--badge-amber-text)', opacity: 0.85 }}>
                Do not include any proprietary business logic, confidential code, or sensitive company information in your submissions. 
                Use your Google Doc for detailed descriptions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSecurityNotice(false)}
              className="transition-colors flex-shrink-0 hover:opacity-70"
              style={{ color: 'var(--badge-amber-text)' }}
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
        <p className="text-xs text-gray-400 -mt-1 mb-2">
          Remember to set links to anyone in Deel can view.
        </p>

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
            Videos should be maximum 4 minutes.
          </p>
          {videoCheckLoading && (
            <div className="text-xs mt-2 p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 flex items-center gap-2">
              <div className="animate-spin w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full" />
              Checking video duration...
            </div>
          )}
          {!videoCheckLoading && videoCheckResult && (
            <div className={`text-xs mt-2 p-2 rounded-lg ${
              videoCheckResult.valid && !videoCheckResult.warning
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : !videoCheckResult.valid
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {!videoCheckResult.valid 
                ? `✗ ${videoCheckResult.error}`
                : videoCheckResult.durationFormatted
                  ? `✓ Video duration: ${videoCheckResult.durationFormatted}`
                  : `⚠ ${videoCheckResult.warning}`
              }
            </div>
          )}
          
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
            Use the <a href="https://docs.google.com/document/d/1MC50GSMPplfOdYrv90hSu5Ugn3nPqZNTh0dk2ZU8bv0/copy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Product template</a>.
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
                    ? 'bg-purple-100 text-[#603786] border-purple-400 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                    : 'border-gray-300 hover:border-gray-400 text-gray-600 dark:border-white/10 dark:hover:border-white/20 dark:text-gray-400'
                }`}
              >
                <span className="font-medium">{PROJECT_TYPE_LABELS[type]}</span>
                <p className={`text-xs mt-1 opacity-70 ${projectType === type ? 'text-[#72469B] dark:text-inherit' : ''}`}>
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
            Create a Slack channel with this name. It allows people to contact you about your project now and in the future.
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
