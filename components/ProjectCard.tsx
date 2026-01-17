'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, type ProjectType } from '@/types'
import { formatDate, getInitials } from '@/lib/utils'

interface Voter {
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
  voters: Voter[]
  voteCount: number
  hasVoted: boolean
  updatedAt: string
  onVote?: (projectId: string) => Promise<void>
  onUnvote?: (projectId: string) => Promise<void>
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
  updatedAt,
  onVote,
  onUnvote,
  canEdit,
}: ProjectCardProps) {
  const { data: session } = useSession()
  const [isHovered, setIsHovered] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted)
  const [localVoteCount, setLocalVoteCount] = useState(voteCount)

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session || isVoting) return

    setIsVoting(true)
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
      console.error('Vote error:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const displayedVoters = voters.slice(0, 5)
  const remainingVoters = voters.length > 5 ? voters.length - 5 : 0

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

        {/* Footer: voters and vote button */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          {/* Voters avatars */}
          <div className="flex items-center gap-2">
            {displayedVoters.length > 0 ? (
              <div className="avatar-stack">
                {displayedVoters.map((voter) => (
                  voter.image ? (
                    <Image
                      key={voter.id}
                      src={voter.image}
                      alt={voter.name || 'Voter'}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div
                      key={voter.id}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/50 to-blue-500/50 flex items-center justify-center text-[10px] font-medium"
                    >
                      {getInitials(voter.name)}
                    </div>
                  )
                ))}
                {remainingVoters > 0 && (
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300">
                    +{remainingVoters}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-500">No votes yet</span>
            )}
            <span className="text-sm text-gray-400">{localVoteCount} votes</span>
          </div>

          {/* Vote button */}
          {session && (
            <button
              onClick={handleVote}
              disabled={isVoting}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${isHovered ? 'opacity-100' : 'opacity-0'}
                ${localHasVoted 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'}
                ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <svg 
                className={`w-4 h-4 ${localHasVoted ? 'fill-purple-400' : ''}`} 
                fill={localHasVoted ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {localHasVoted ? 'Voted' : 'Vote'}
            </button>
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
