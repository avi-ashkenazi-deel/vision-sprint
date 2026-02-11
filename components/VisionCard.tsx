'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { VISION_AREA_COLORS, type VisionWithDetails } from '@/types'
import { getInitials } from '@/lib/utils'

interface VisionCardProps {
  vision: VisionWithDetails & { hasLiked: boolean }
  onLikeToggle?: (visionId: string, liked: boolean) => void
}

export function VisionCard({ vision, onLikeToggle }: VisionCardProps) {
  const { data: session } = useSession()
  const [likeCount, setLikeCount] = useState(vision._count.likes)
  const [hasLiked, setHasLiked] = useState(vision.hasLiked)
  const [liking, setLiking] = useState(false)

  const handleLikeToggle = async () => {
    if (!session?.user?.id || liking) return

    setLiking(true)
    try {
      const res = await fetch(`/api/visions/${vision.id}/likes`, {
        method: hasLiked ? 'DELETE' : 'POST',
      })

      if (res.ok) {
        setHasLiked(!hasLiked)
        setLikeCount((prev) => (hasLiked ? prev - 1 : prev + 1))
        onLikeToggle?.(vision.id, !hasLiked)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    } finally {
      setLiking(false)
    }
  }

  const areaColor = VISION_AREA_COLORS[vision.area] || VISION_AREA_COLORS['Other']

  return (
    <div className="glass-card p-6 hover:border-white/20 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`badge text-xs ${areaColor}`}>
              {vision.area}
            </span>
            {vision._count.projects > 0 && (
              <span className="text-xs text-gray-500">
                {vision._count.projects} project{vision._count.projects !== 1 ? 's' : ''} aligned
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
            {vision.title}
          </h3>
        </div>

        {/* Like button */}
        <button
          onClick={handleLikeToggle}
          disabled={!session?.user?.id || liking}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            hasLiked
              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:border-pink-500/30 hover:text-pink-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <svg
            className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`}
            fill={hasLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="text-sm font-medium">{likeCount}</span>
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        {/* Creator */}
        <div className="flex items-center gap-2">
          {vision.createdBy.image ? (
            <Image
              src={vision.createdBy.image}
              alt={vision.createdBy.name || 'User'}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-medium">
              {getInitials(vision.createdBy.name)}
            </div>
          )}
          <span className="text-xs text-gray-400">
            Added by {vision.createdBy.name}
          </span>
        </div>

        {/* Doc link */}
        {vision.docUrl && (
          <a
            href={vision.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Document
          </a>
        )}
      </div>

      {/* Who liked - show avatars */}
      {vision.likes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500 mb-2">Liked by</p>
          <div className="flex items-center -space-x-2">
            {vision.likes.slice(0, 8).map((like) => (
              <div key={like.id} className="relative" title={like.user.name || 'User'}>
                {like.user.image ? (
                  <Image
                    src={like.user.image}
                    alt={like.user.name || 'User'}
                    width={28}
                    height={28}
                    className="rounded-full border-2 border-[#0d1117]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-medium border-2 border-[#0d1117]">
                    {getInitials(like.user.name)}
                  </div>
                )}
              </div>
            ))}
            {vision.likes.length > 8 && (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium border-2 border-[#0d1117]">
                +{vision.likes.length - 8}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
