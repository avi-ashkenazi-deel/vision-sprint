'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, type ProjectType } from '@/types'

type TransitionPhase = 'idle' | 'wipe-in' | 'wipe-out' | 'created' | 'fading-out'

const COUNTDOWN_SECONDS = 4

const MOCK_PROJECT = {
  id: 'test-123',
  name: 'My Amazing Hackathon Project',
  projectType: 'MOONSHOT' as ProjectType,
}

export default function TestAnimationPage() {
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const [speed, setSpeed] = useState<'normal' | 'slow'>('normal')

  const wipeInMs = speed === 'slow' ? 1500 : 750
  const wipeOutDelay = speed === 'slow' ? 400 : 200
  const createdMs = speed === 'slow' ? 3000 : 1500

  // Logo-branded confetti burst (same as ProjectForm)
  const fireConfetti = useCallback(() => {
    const colors = ['#FDCD2A', '#C46BF5', '#9ED9FF', '#FFC511', '#a78bfa']
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, startVelocity: 45 })
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, startVelocity: 45 })
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 90, origin: { x: 0.5, y: 0.5 }, colors, startVelocity: 35 })
    }, 300)
  }, [])

  // Countdown timer
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const runAnimation = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS)
    setPhase('wipe-in')

    setTimeout(() => {
      setPhase('wipe-out')
      setTimeout(() => fireConfetti(), wipeOutDelay)
    }, wipeInMs)

    setTimeout(() => {
      setPhase('created')
    }, createdMs)
  }, [fireConfetti, wipeInMs, wipeOutDelay, createdMs])

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

  // When countdown hits 0, fade out then reset (in real app: navigate)
  useEffect(() => {
    if (countdown === 0 && phase === 'created') {
      setPhase('fading-out')
      setTimeout(() => {
        setPhase('idle')
      }, 500)
    }
  }, [countdown, phase])

  const reset = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setPhase('idle')
  }

  // ── Idle state: controls ──
  if (phase === 'idle') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8" style={{ background: 'var(--background)' }}>
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Animation Test Page
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            Test the project creation chevron wipe transition in isolation.
          </p>
        </div>

        {/* Speed toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Speed:</span>
          <div className="tab-group">
            <button
              onClick={() => setSpeed('normal')}
              className={`tab-item ${speed === 'normal' ? 'active' : ''}`}
            >
              Normal
            </button>
            <button
              onClick={() => setSpeed('slow')}
              className={`tab-item ${speed === 'slow' ? 'active' : ''}`}
            >
              Slow (2x)
            </button>
          </div>
        </div>

        {/* Mock project preview */}
        <div className="glass-card p-6 w-full max-w-md">
          <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--foreground-secondary)' }}>
            Mock project data
          </p>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            {MOCK_PROJECT.name}
          </h3>
          <span className={`badge text-sm ${PROJECT_TYPE_COLORS[MOCK_PROJECT.projectType]}`}>
            {PROJECT_TYPE_LABELS[MOCK_PROJECT.projectType]}
          </span>
        </div>

        {/* Run button */}
        <button
          onClick={runAnimation}
          className="btn-primary text-lg px-8 py-4 flex items-center gap-3"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Run Transition
        </button>

        {/* Timing info */}
        <div className="text-xs text-center space-y-1" style={{ color: 'var(--foreground-secondary)' }}>
          <p>Wipe-in: {wipeInMs}ms &rarr; Wipe-out: {createdMs - wipeInMs}ms &rarr; Created state</p>
          <p>Confetti fires {wipeOutDelay}ms into wipe-out</p>
        </div>
      </div>
    )
  }

  // ── Transition + success view ──
  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
      {/* ── Chevron wipe overlay ── */}
      {(phase === 'wipe-in' || phase === 'wipe-out') && (
        <div
          className={`fixed inset-0 z-50 ${phase === 'wipe-in' ? 'chevron-wipe-in' : 'chevron-wipe-out'}`}
          style={{
            background: 'linear-gradient(135deg, #FDCD2A 0%, #FFC511 40%, #C46BF5 100%)',
            animationDuration: speed === 'slow' ? '1.4s' : undefined,
          }}
        >
          {phase === 'wipe-in' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="VisionSprint"
                className="w-[40vw] max-w-[600px] h-auto object-contain opacity-0 animate-logoSlideUp"
                style={{
                  animationDelay: speed === 'slow' ? '0.3s' : '0.15s',
                  animationDuration: speed === 'slow' ? '1.2s' : undefined,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Success content ── */}
      <div className={`${phase === 'wipe-in' ? 'opacity-0' : ''} ${phase === 'fading-out' ? 'animate-fadeOutDown' : ''}`}>
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
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
              {MOCK_PROJECT.name}
            </h2>
            <span className={`badge text-sm ${PROJECT_TYPE_COLORS[MOCK_PROJECT.projectType]}`}>
              {PROJECT_TYPE_LABELS[MOCK_PROJECT.projectType]}
            </span>
          </div>

          {/* Creator info */}
          <div className="mt-8 animate-successSlideUp" style={{ animationDelay: '0.4s', opacity: 0 }}>
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-medium text-white">
                TA
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Test Author
                </p>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                  Submitted just now
                </p>
              </div>
            </div>
          </div>

          {/* Countdown timer + redirect */}
          <div className="mt-10 flex flex-col items-center gap-4 animate-successSlideUp" style={{ animationDelay: '0.6s', opacity: 0 }}>
            {/* Circular countdown ring */}
            <div className="relative w-14 h-14">
              <svg width="56" height="56" viewBox="0 0 56 56" className="rotate-[-90deg]">
                {/* Background ring */}
                <circle
                  cx="28" cy="28" r="24"
                  stroke="var(--card-border)" strokeWidth="3" fill="none"
                />
                {/* Depleting ring */}
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
              {/* Number in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                  {countdown}
                </span>
              </div>
            </div>

            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Redirecting to projects...
            </p>

            {/* Skip / replay button */}
            <button
              onClick={reset}
              className="btn-secondary text-sm px-4 py-2 mt-2"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
