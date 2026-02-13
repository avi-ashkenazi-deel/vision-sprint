'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, type ProjectType } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'

interface UserInfo {
  id: string
  name: string | null
  image: string | null
}

interface ProjectCardProps {
  id: string
  name: string
  description: string
  projectType: ProjectType
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  voters: UserInfo[]
  voteCount: number
  hasVoted: boolean
  joiners?: UserInfo[]
  joinCount?: number
  hasJoined?: boolean
  updatedAt: string
  onVote?: (projectId: string) => Promise<void>
  onUnvote?: (projectId: string) => Promise<void>
  onJoin?: (projectId: string) => Promise<void>
  canEdit?: boolean
}

export function ProjectCard({
  id,
  name,
  description,
  projectType,
  creator,
  voters,
  voteCount,
  hasVoted,
  joiners = [],
  joinCount = 0,
  hasJoined = false,
  updatedAt,
  onVote,
  onUnvote,
  onJoin,
  canEdit,
}: ProjectCardProps) {
  const { data: session } = useSession()
  const [isHovered, setIsHovered] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted)
  const [localVoteCount, setLocalVoteCount] = useState(voteCount)
  const [localHasJoined, setLocalHasJoined] = useState(hasJoined)
  const [localJoinCount, setLocalJoinCount] = useState(joinCount)

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session || isLiking) return

    setIsLiking(true)
    try {
      if (localHasVoted && onUnvote) {
        await onUnvote(id)
        setLocalHasVoted(false)
        setLocalVoteCount((prev) => prev - 1)
      } else if (!localHasVoted && onVote) {
        await onVote(id)
        setLocalHasVoted(true)
        setLocalVoteCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Like error:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session || isJoining || !onJoin) return

    setIsJoining(true)
    try {
      await onJoin(id)
      setLocalHasJoined(!localHasJoined)
      setLocalJoinCount((prev) => localHasJoined ? prev - 1 : prev + 1)
    } catch (error) {
      console.error('Join error:', error)
    } finally {
      setIsJoining(false)
    }
  }

  // Combine voters and joiners for display, prioritizing joiners
  const allInterested = [...joiners, ...voters.filter(v => !joiners.some(j => j.id === v.id))]
  const displayedUsers = allInterested.slice(0, 5)
  const remainingUsers = allInterested.length > 5 ? allInterested.length - 5 : 0

  return (
    <Link href={`/projects/${id}`}>
      <div
        className="glass-card glass-card-hover p-5 cursor-pointer relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Type badge */}
        <div className="flex items-start justify-between mb-3">
          <span className={`badge ${PROJECT_TYPE_COLORS[projectType]}`}>
            {PROJECT_TYPE_LABELS[projectType]}
          </span>
          {canEdit && (
            <Link
              href={`/projects/${id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Link>
          )}
        </div>

        {/* Project name */}
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{name}</h3>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{description}</p>

        {/* Creator */}
        <div className="flex items-center gap-2 mb-4">
          {creator.image ? (
            <Image
              src={creator.image}
              alt={creator.name || 'Creator'}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-medium">
              {getInitials(creator.name)}
            </div>
          )}
          <span className="text-sm text-gray-300">{creator.name}</span>
        </div>

        {/* Footer: interested users and action buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          {/* Interested users avatars and stats */}
          <div className="flex items-center gap-2">
            {displayedUsers.length > 0 ? (
              <div className="avatar-stack">
                {displayedUsers.map((user) => (
                  user.image ? (
                    <Image
                      key={user.id}
                      src={user.image}
                      alt={user.name || 'User'}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div
                      key={user.id}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-[10px] font-medium"
                    >
                      {getInitials(user.name)}
                    </div>
                  )
                ))}
                {remainingUsers > 0 && (
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300">
                    +{remainingUsers}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-500">No interest yet</span>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{localVoteCount} likes</span>
              {localJoinCount > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-emerald-400">{localJoinCount} joining</span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {session && (
            <div className={`flex items-center gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              {/* Like button */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`
                  flex items-center gap-1.5 text-sm font-medium
                  ${localHasVoted ? 'btn-like-active' : 'btn-like'}
                  ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <svg 
                  className={`w-4 h-4 ${localHasVoted ? 'fill-pink-400' : ''}`} 
                  fill={localHasVoted ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {localHasVoted ? 'Liked' : 'Like'}
              </button>

              {/* Join button */}
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className={`
                  flex items-center gap-1.5 text-sm font-medium
                  ${localHasJoined ? 'btn-join-active' : 'btn-join'}
                  ${isJoining ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {localHasJoined ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  )}
                </svg>
                {localHasJoined ? 'Joined' : 'Join'}
              </button>
            </div>
          )}
        </div>

        {/* Updated date tooltip */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-gray-500">Updated {formatDate(updatedAt)}</span>
        </div>
      </div>
    </Link>
  )
}
