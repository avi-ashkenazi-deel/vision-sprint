'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getInitials } from '@/lib/utils'
import { REACTION_EMOJIS, type ReactionType } from '@/types'

interface TeamMember {
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface VideoPlayerProps {
  videoUrl: string
  teamName: string
  projectName: string
  members: TeamMember[]
  currentIndex: number
  totalCount: number
  reactions: Record<ReactionType, number>
  userReactions: ReactionType[]
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onReact: (type: ReactionType) => void
  onVideoEnd: () => void
  autoPlay?: boolean
}

export function VideoPlayer({
  videoUrl,
  teamName,
  projectName,
  members,
  currentIndex,
  totalCount,
  reactions,
  userReactions,
  onPrev,
  onNext,
  onClose,
  onReact,
  onVideoEnd,
  autoPlay = false,
}: VideoPlayerProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [isPlaying, setIsPlaying] = useState(autoPlay)

  // Extract Google Drive video ID and create embed URL
  const getEmbedUrl = (url: string) => {
    // Handle Google Drive links
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`
    }
    
    // Handle YouTube links
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/)
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=${autoPlay ? 1 : 0}`
    }

    // Return original URL for other sources
    return url
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrev, onNext])

  const reactionTypes: ReactionType[] = ['MEDAL', 'HEART', 'SHOCK', 'PARTY']

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
        <span className="text-sm font-medium">
          {currentIndex + 1} of {totalCount}
        </span>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={onNext}
        disabled={currentIndex === totalCount - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Video container */}
      <div
        className="h-full flex items-center justify-center p-12"
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
      >
        <div className="relative w-full max-w-5xl aspect-video bg-gray-900 rounded-xl overflow-hidden">
          {/* Video iframe */}
          <iframe
            src={getEmbedUrl(videoUrl)}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />

          {/* Team info overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 pointer-events-none ${
              showOverlay ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-2xl font-bold mb-2">{projectName}</h2>
              <p className="text-gray-300 mb-4">{teamName}</p>
              
              <div className="flex items-center gap-3">
                {members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm"
                  >
                    {member.user.image ? (
                      <Image
                        src={member.user.image}
                        alt={member.user.name || ''}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-xs">
                        {getInitials(member.user.name)}
                      </div>
                    )}
                    <span className="text-sm">{member.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reactions bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm">
          {reactionTypes.map((type) => (
            <button
              key={type}
              onClick={() => onReact(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                userReactions.includes(type)
                  ? 'bg-purple-500/30 scale-110'
                  : 'hover:bg-white/10'
              }`}
            >
              <span className="text-2xl">{REACTION_EMOJIS[type]}</span>
              <span className="text-sm font-medium">{reactions[type] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Auto-advance button */}
      <div className="absolute bottom-8 right-8 z-50">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            isPlaying
              ? 'bg-purple-500/30 text-purple-300'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          {isPlaying ? 'Auto-play On' : 'Auto-play Off'}
        </button>
      </div>
    </div>
  )
}
