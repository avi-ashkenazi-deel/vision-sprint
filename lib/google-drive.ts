/**
 * Google Drive API utility for checking video metadata (duration, etc.)
 */

const MAX_VIDEO_DURATION_MS = 4 * 60 * 1000 // 4 minutes in milliseconds

/**
 * Extract a Google Drive file ID from various URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/preview
 * - https://docs.google.com/file/d/FILE_ID/edit
 * - https://drive.google.com/open?id=FILE_ID
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null

  // Match /d/FILE_ID/ pattern
  const dMatch = url.match(/(?:drive\.google\.com|docs\.google\.com)\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (dMatch) return dMatch[1]

  // Match ?id=FILE_ID pattern
  const idMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
  if (idMatch) return idMatch[1]

  return null
}

interface DriveVideoMetadata {
  durationMs: number
  durationFormatted: string
  width?: number
  height?: number
  fileName?: string
}

/**
 * Fetch video metadata from Google Drive API using the user's access token.
 * Returns duration info or null if the file isn't a video or can't be accessed.
 */
export async function getVideoDuration(
  fileId: string,
  accessToken: string
): Promise<DriveVideoMetadata | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,videoMediaMetadata`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[Drive API] Error ${res.status}:`, errorText)
      return null
    }

    const data = await res.json()

    if (!data.videoMediaMetadata?.durationMillis) {
      console.log('[Drive API] No video metadata found for file:', data.name, data.mimeType)
      return null
    }

    const durationMs = parseInt(data.videoMediaMetadata.durationMillis, 10)
    const totalSeconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`

    return {
      durationMs,
      durationFormatted,
      width: data.videoMediaMetadata.width || undefined,
      height: data.videoMediaMetadata.height || undefined,
      fileName: data.name || undefined,
    }
  } catch (error) {
    console.error('[Drive API] Failed to fetch video metadata:', error)
    return null
  }
}

/**
 * Validate that a Google Drive video URL points to a video under 4 minutes.
 * Returns { valid: true } or { valid: false, error: string, durationFormatted? }
 */
export async function validateVideoDuration(
  videoUrl: string,
  accessToken: string
): Promise<{ valid: boolean; error?: string; durationFormatted?: string }> {
  const fileId = extractDriveFileId(videoUrl)

  if (!fileId) {
    // Can't extract file ID — skip duration check, let other validation handle URL format
    return { valid: true }
  }

  const metadata = await getVideoDuration(fileId, accessToken)

  if (!metadata) {
    // Can't access video metadata — could be permissions, not a video, etc.
    // Don't block submission, just warn
    console.warn('[Drive API] Could not verify video duration for:', videoUrl)
    return { valid: true }
  }

  if (metadata.durationMs > MAX_VIDEO_DURATION_MS) {
    return {
      valid: false,
      error: `Video is ${metadata.durationFormatted} long. Maximum allowed is 4:00.`,
      durationFormatted: metadata.durationFormatted,
    }
  }

  return { valid: true, durationFormatted: metadata.durationFormatted }
}
