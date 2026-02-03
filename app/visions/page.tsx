'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { VisionCard } from '@/components/VisionCard'
import { VISION_AREAS, VISION_AREA_COLORS, type VisionWithDetails } from '@/types'

type SortOption = 'likes' | 'recent' | 'projects'

export default function VisionsPage() {
  const { data: session } = useSession()
  const [visions, setVisions] = useState<(VisionWithDetails & { hasLiked: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('likes')
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state for adding new vision
  const [newVision, setNewVision] = useState({
    title: '',
    description: '',
    area: 'Growth',
    docUrl: '',
    kpis: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetchVisions()
  }, [])

  const fetchVisions = async () => {
    try {
      const res = await fetch('/api/visions')
      if (res.ok) {
        const data = await res.json()
        setVisions(data)
      }
    } catch (error) {
      console.error('Failed to fetch visions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitVision = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/visions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVision),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create vision')
      }

      // Refresh visions
      await fetchVisions()
      setShowAddForm(false)
      setNewVision({ title: '', description: '', area: 'Growth', docUrl: '', kpis: '' })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create vision')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter and sort visions
  const filteredVisions = visions
    .filter((v) => !selectedArea || v.area === selectedArea)
    .sort((a, b) => {
      switch (sortBy) {
        case 'likes':
          return b._count.likes - a._count.likes
        case 'recent':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        case 'projects':
          return b._count.projects - a._count.projects
        default:
          return 0
      }
    })

  // Get area counts
  const areaCounts = visions.reduce((acc, v) => {
    acc[v.area] = (acc[v.area] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Vision Documents
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Browse company visions and KPIs to inspire your project ideas. Like the visions
            that are relevant to your area to help suggesters understand what matters most.
          </p>
        </div>

        {/* Add Vision Button (Admin only) */}
        {session?.user?.isAdmin && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary"
            >
              {showAddForm ? 'Cancel' : '+ Add Vision'}
            </button>

            {/* Add Vision Form */}
            {showAddForm && (
              <form onSubmit={handleSubmitVision} className="mt-4 glass-card p-6 space-y-4">
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newVision.title}
                    onChange={(e) => setNewVision({ ...newVision, title: e.target.value })}
                    required
                    placeholder="e.g., Improve Customer Retention by 20%"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newVision.description}
                    onChange={(e) => setNewVision({ ...newVision, description: e.target.value })}
                    required
                    rows={4}
                    placeholder="Describe the vision and its importance..."
                    className="input-field resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Area *
                    </label>
                    <select
                      value={newVision.area}
                      onChange={(e) => setNewVision({ ...newVision, area: e.target.value })}
                      className="input-field"
                    >
                      {VISION_AREAS.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Document URL
                    </label>
                    <input
                      type="url"
                      value={newVision.docUrl}
                      onChange={(e) => setNewVision({ ...newVision, docUrl: e.target.value })}
                      placeholder="https://docs.google.com/..."
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Related KPIs
                  </label>
                  <input
                    type="text"
                    value={newVision.kpis}
                    onChange={(e) => setNewVision({ ...newVision, kpis: e.target.value })}
                    placeholder="e.g., NPS, Churn Rate, Monthly Active Users"
                    className="input-field"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Vision'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Area filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedArea(null)}
              className={`badge text-sm ${
                !selectedArea
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
              }`}
            >
              All Areas ({visions.length})
            </button>
            {VISION_AREAS.filter((area) => areaCounts[area]).map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area === selectedArea ? null : area)}
                className={`badge text-sm ${
                  selectedArea === area
                    ? VISION_AREA_COLORS[area]
                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                }`}
              >
                {area} ({areaCounts[area] || 0})
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input-field py-1 px-2 text-sm"
            >
              <option value="likes">Most Liked</option>
              <option value="recent">Most Recent</option>
              <option value="projects">Most Projects</option>
            </select>
          </div>
        </div>

        {/* Visions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="h-5 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-700 rounded w-4/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredVisions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {selectedArea ? `No visions in ${selectedArea}` : 'No visions yet'}
            </h3>
            <p className="text-gray-500">
              {session?.user?.isAdmin
                ? 'Add the first vision to help inspire project ideas.'
                : 'Check back later for vision documents.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVisions.map((vision) => (
              <VisionCard key={vision.id} vision={vision} />
            ))}
          </div>
        )}

        {/* Info section */}
        <div className="mt-12 glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            How to use Vision Documents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-400">
            <div>
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-white mb-1">Like relevant visions</h3>
              <p>Click the heart to like visions that are important to your area. This helps project suggesters understand priorities.</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-medium text-white mb-1">Get inspired</h3>
              <p>Browse visions to find ideas that align with company goals. Use them as inspiration for your project submissions.</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="font-medium text-white mb-1">Link your project</h3>
              <p>When creating a project, select a related vision to show strategic alignment and strengthen your proposal.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
