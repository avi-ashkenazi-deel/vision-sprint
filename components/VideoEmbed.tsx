'use client'

import { useMemo, useEffect, useRef, useState, memo } from 'react'

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void
            onStateChange?: (event: { data: number }) => void
          }
        }
      ) => YouTubePlayer
      PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YouTubePlayer {
  destroy: () => void
  playVideo: () => void
}

interface VideoEmbedProps {
  url: string
  title?: string
  className?: string
  onEnded?: () => void
  autoPlay?: boolean
}

// Track if API is loaded
let ytApiLoaded = false
let ytApiLoading = false
const ytApiCallbacks: (() => void)[] = []

function loadYouTubeAPI(callback: () => void) {
  if (ytApiLoaded) {
    callback()
    return
  }
  
  ytApiCallbacks.push(callback)
  
  if (ytApiLoading) return
  ytApiLoading = true
  
  const tag = document.createElement('script')
  tag.src = 'https://www.youtube.com/iframe_api'
  const firstScriptTag = document.getElementsByTagName('script')[0]
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  
  window.onYouTubeIframeAPIReady = () => {
    ytApiLoaded = true
    ytApiCallbacks.forEach(cb => cb())
    ytApiCallbacks.length = 0
  }
}

function VideoEmbedComponent({ url, title = 'Video', className = '', onEnded, autoPlay = false }: VideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const onEndedRef = useRef(onEnded)
  const [playerId] = useState(() => `yt-player-${Math.random().toString(36).slice(2, 9)}`)

  // Keep onEnded ref up to date without triggering re-renders
  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  const { videoId, isYouTube, embedUrl } = useMemo(() => {
    if (!url) return { videoId: null, isYouTube: false, embedUrl: null }

    // YouTube - various formats
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ]
    
    for (const pattern of youtubePatterns) {
      const match = url.match(pattern)
      if (match) {
        return { videoId: match[1], isYouTube: true, embedUrl: null }
      }
    }

    // Google Drive
    const drivePatterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    ]
    
    for (const pattern of drivePatterns) {
      const match = url.match(pattern)
      if (match) {
        return { videoId: null, isYouTube: false, embedUrl: `https://drive.google.com/file/d/${match[1]}/preview` }
      }
    }

    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
    if (loomMatch) {
      return { videoId: null, isYouTube: false, embedUrl: `https://www.loom.com/embed/${loomMatch[1]}` }
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) {
      return { videoId: null, isYouTube: false, embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
    }

    if (url.includes('/embed') || url.includes('/preview')) {
      return { videoId: null, isYouTube: false, embedUrl: url }
    }

    return { videoId: null, isYouTube: false, embedUrl: null }
  }, [url])

  // Initialize YouTube player
  useEffect(() => {
    if (!isYouTube || !videoId) return

    loadYouTubeAPI(() => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }

      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: (event) => {
            // 0 = ended
            if (event.data === 0 && onEndedRef.current) {
              onEndedRef.current()
            }
          },
        },
      })
    })

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [isYouTube, videoId, playerId, autoPlay])

  if (!videoId && !embedUrl) {
    return (
      <div className={`p-6 rounded-xl bg-white/5 border border-white/10 ${className}`}>
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-white">Video Link</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm break-all"
            >
              {url}
            </a>
          </div>
        </div>
      </div>
    )
  }

  // YouTube uses the API player
  if (isYouTube) {
    return (
      <div className={`video-embed ${className}`} ref={containerRef}>
        <div id={playerId} />
      </div>
    )
  }

  // Other providers use iframe
  return (
    <div className={`video-embed ${className}`}>
      <iframe
        src={embedUrl!}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

// Memoize to prevent re-renders when parent state changes
export const VideoEmbed = memo(VideoEmbedComponent, (prevProps, nextProps) => {
  // Only re-render if url, title, className, or autoPlay change
  // Ignore onEnded since we use a ref for it
  return (
    prevProps.url === nextProps.url &&
    prevProps.title === nextProps.title &&
    prevProps.className === nextProps.className &&
    prevProps.autoPlay === nextProps.autoPlay
  )
})

// Helper to check if a URL can be embedded
export function canEmbed(url: string): boolean {
  if (!url) return false
  
  const patterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /youtube\.com\/embed\//,
    /drive\.google\.com\/file\/d\//,
    /drive\.google\.com\/open\?id=/,
    /loom\.com\/share\//,
    /vimeo\.com\//,
  ]
  
  return patterns.some(pattern => pattern.test(url))
}
