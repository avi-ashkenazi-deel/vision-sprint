/**
 * Google Drive API utility for checking video metadata (duration, etc.)
 * Supports two auth modes:
 *  1. OAuth access token (from user's Google sign-in)
 *  2. API key fallback (for public "anyone with the link" files)
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
 * Fetch video metadata from Google Drive API.
 * Tries OAuth token first, then falls back to API key for public files.
 */
export async function getVideoDuration(
  fileId: string,
  accessToken?: string | null
): Promise<DriveVideoMetadata | null> {
  const fields = 'name,mimeType,videoMediaMetadata'

  // Try OAuth token first
  if (accessToken) {
    const result = await fetchDriveFile(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${fields}`,
      { Authorization: `Bearer ${accessToken}` }
    )
    if (result) return result
    console.log('[Drive API] OAuth token failed or no video metadata, trying API key...')
  }

  // Fallback to API key (works for public files)
  const apiKey = process.env.GOOGLE_API_KEY
  if (apiKey) {
    const result = await fetchDriveFile(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${fields}&key=${apiKey}`,
      {}
    )
    if (result) return result
    console.log('[Drive API] API key approach also returned no video metadata')
  } else {
    console.log('[Drive API] No GOOGLE_API_KEY configured — cannot check video duration without OAuth token')
  }

  return null
}

async function fetchDriveFile(
  url: string,
  headers: Record<string, string>
): Promise<DriveVideoMetadata | null> {
  try {
    const res = await fetch(url, { headers })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[Drive API] Error ${res.status}:`, errorText)
      return null
    }

    const data = await res.json()

    if (!data.videoMediaMetadata?.durationMillis) {
      console.log('[Drive API] No video metadata for:', data.name, data.mimeType)
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
    console.error('[Drive API] Fetch failed:', error)
    return null
  }
}

/**
 * Validate that a Google Drive video URL points to a video under 4 minutes.
 * Returns { valid, error?, durationFormatted?, warning? }
 */
export async function validateVideoDuration(
  videoUrl: string,
  accessToken?: string | null
): Promise<{ valid: boolean; error?: string; durationFormatted?: string; warning?: string }> {
  const fileId = extractDriveFileId(videoUrl)

  if (!fileId) {
    return { valid: true, warning: 'Could not extract file ID from URL' }
  }

  const metadata = await getVideoDuration(fileId, accessToken)

  if (!metadata) {
    return {
      valid: true,
      warning: 'Could not read video metadata. Make sure the file is shared as "Anyone with the link can view".',
    }
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
