'use client'

import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

interface ConfettiCelebrationProps {
  onComplete?: () => void
}

export function ConfettiCelebration({ onComplete }: ConfettiCelebrationProps) {
  const hasRun = useRef(false)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    // Fire confetti from multiple origins
    const duration = 5000
    const end = Date.now() + duration

    const colors = ['#a855f7', '#3b82f6', '#ec4899', '#10b981', '#f59e0b']

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors,
      })

      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()

    // Big burst in the middle
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
        startVelocity: 45,
      })
    }, 500)

    // Show button after confetti settles
    setTimeout(() => {
      setShowButton(true)
    }, 2000)

    return () => {}
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center animate-fadeIn">
        <div className="text-8xl mb-8">🎉</div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Well Done!
        </h1>
        <p className="text-xl text-gray-300 mb-4">
          You&apos;ve watched all the project videos!
        </p>
        <p className="text-gray-400 mb-8">
          Thank you for supporting your colleagues&apos; amazing work
        </p>
        
        {showButton && (
          <button
            onClick={onComplete}
            className="btn-primary px-6 py-3 text-lg animate-fadeIn"
          >
            🏠 Back to Showcase
          </button>
        )}
      </div>
    </div>
  )
}
