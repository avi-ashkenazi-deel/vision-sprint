import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateVideoDuration, extractDriveFileId } from '@/lib/google-drive'

/**
 * POST /api/projects/check-video
 * Check the duration of a Google Drive video.
 * Uses OAuth token if available, falls back to API key for public files.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoUrl } = await request.json()

    if (!videoUrl) {
      return NextResponse.json({ error: 'No video URL provided' }, { status: 400 })
    }

    const fileId = extractDriveFileId(videoUrl)
    if (!fileId) {
      return NextResponse.json({ error: 'Could not extract file ID from URL' }, { status: 400 })
    }

    // Pass access token if available (Google OAuth), otherwise null (will use API key)
    const result = await validateVideoDuration(videoUrl, session.accessToken || null)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error checking video:', error)
    return NextResponse.json({ error: 'Failed to check video' }, { status: 500 })
  }
}
