'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'

const SphereCluster = dynamic(
  () => import('./SphereCluster').then((mod) => mod.SphereCluster),
  { ssr: false }
)

interface EmptyStateProps {
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  title = 'No projects yet',
  description = 'Be the first to submit a project idea for the hackathon!',
  actionLabel = 'Create First Project',
  actionHref = '/projects/new',
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fadeIn">
      {/* 3D Sphere Cluster */}
      <div className="relative w-full max-w-3xl h-72 sm:h-80 mb-6">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <SphereCluster />
      </div>

      <h2 className="text-2xl font-semibold text-white mb-3">{title}</h2>
      <p className="text-gray-400 text-center max-w-md mb-8">{description}</p>

      {onAction ? (
        <button onClick={onAction} className="btn-primary text-lg px-8 py-3">
          {actionLabel}
        </button>
      ) : (
        <Link href={actionHref} className="btn-primary text-lg px-8 py-3">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
