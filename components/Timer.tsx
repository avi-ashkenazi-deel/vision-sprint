'use client'

import { useState, useEffect } from 'react'

interface TimerProps {
  endDate: Date
  label?: string
}

export function Timer({ endDate, label = 'Time Remaining' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

  function calculateTimeLeft() {
    const difference = new Date(endDate).getTime() - new Date().getTime()
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true }
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isOver: false,
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  const timeBlocks = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Minutes' },
    { value: timeLeft.seconds, label: 'Seconds' },
  ]

  if (timeLeft.isOver) {
    return (
      <div className="text-center">
        <p className="text-gray-400 mb-2">{label}</p>
        <div className="glass-card p-6 animate-pulse-glow">
          <p className="text-2xl font-bold text-purple-400">Time&apos;s Up!</p>
          <p className="text-gray-400 mt-2">Sprint has ended</p>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="text-gray-400 mb-4">{label}</p>
      <div className="flex justify-center gap-4">
        {timeBlocks.map((block, index) => (
          <div key={block.label} className="flex items-center gap-4">
            <div className="glass-card p-4 min-w-[80px]">
              <div className="text-3xl font-bold text-white font-mono">
                {String(block.value).padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-400 mt-1">{block.label}</div>
            </div>
            {index < timeBlocks.length - 1 && (
              <span className="text-2xl text-gray-500 font-bold">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
