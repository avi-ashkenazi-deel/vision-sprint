import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST mark video as watched
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teamId } = body

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // Create watched record (upsert to handle duplicates)
    await prisma.watchedVideo.upsert({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        teamId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking video as watched:', error)
    return NextResponse.json({ error: 'Failed to mark video as watched' }, { status: 500 })
  }
}

// GET watched videos for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const watchedVideos = await prisma.watchedVideo.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    })

    return NextResponse.json(watchedVideos.map((w) => w.teamId))
  } catch (error) {
    console.error('Error fetching watched videos:', error)
    return NextResponse.json({ error: 'Failed to fetch watched videos' }, { status: 500 })
  }
}
