'use client'

import Link from 'next/link'

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
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fadeIn">
      {/* Illustration */}
      <div className="relative w-64 h-64 mb-8">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
        
        {/* Main illustration */}
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full"
        >
          {/* Desk/platform */}
          <ellipse cx="100" cy="160" rx="70" ry="15" fill="rgba(255,255,255,0.03)" />
          
          {/* Document stack */}
          <rect x="55" y="90" width="50" height="60" rx="4" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          <rect x="60" y="85" width="50" height="60" rx="4" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          <rect x="65" y="80" width="50" height="60" rx="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
          
          {/* Lines on document */}
          <line x1="72" y1="92" x2="108" y2="92" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="72" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round"/>
          <line x1="72" y1="108" x2="104" y2="108" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round"/>
          
          {/* Lightbulb */}
          <g transform="translate(120, 50)">
            <circle cx="25" cy="25" r="20" fill="url(#bulbGradient)" opacity="0.9"/>
            <path d="M18 45 L18 55 Q18 60 25 60 Q32 60 32 55 L32 45" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <circle cx="25" cy="25" r="8" fill="rgba(255,255,200,0.6)"/>
            {/* Light rays */}
            <line x1="25" y1="-5" x2="25" y2="-12" stroke="rgba(255,255,200,0.4)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="45" y1="25" x2="52" y2="25" stroke="rgba(255,255,200,0.4)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="5" y1="25" x2="-2" y2="25" stroke="rgba(255,255,200,0.4)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="39" y1="11" x2="44" y2="6" stroke="rgba(255,255,200,0.3)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="11" y1="11" x2="6" y2="6" stroke="rgba(255,255,200,0.3)" strokeWidth="2" strokeLinecap="round"/>
          </g>
          
          {/* Sparkles */}
          <g fill="rgba(168,85,247,0.6)">
            <circle cx="45" cy="60" r="2"/>
            <circle cx="160" cy="100" r="2"/>
            <circle cx="40" cy="130" r="1.5"/>
            <circle cx="165" cy="140" r="1.5"/>
          </g>
          
          <defs>
            <linearGradient id="bulbGradient" x1="5" y1="5" x2="45" y2="45">
              <stop offset="0%" stopColor="rgba(168,85,247,0.3)"/>
              <stop offset="100%" stopColor="rgba(59,130,246,0.3)"/>
            </linearGradient>
          </defs>
        </svg>
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
