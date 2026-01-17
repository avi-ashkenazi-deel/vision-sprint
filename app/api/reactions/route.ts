import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST create/toggle reaction
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, reactionType } = body

    if (!projectId || !reactionType) {
      return NextResponse.json(
        { error: 'Project ID and reaction type required' },
        { status: 400 }
      )
    }

    // Check if reaction exists
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        userId_projectId_reactionType: {
          userId: session.user.id,
          projectId,
          reactionType,
        },
      },
    })

    if (existingReaction) {
      // Remove reaction (toggle off)
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      })
      return NextResponse.json({ removed: true })
    }

    // Create new reaction
    const reaction = await prisma.reaction.create({
      data: {
        userId: session.user.id,
        projectId,
        reactionType,
      },
    })

    return NextResponse.json(reaction, { status: 201 })
  } catch (error) {
    console.error('Error handling reaction:', error)
    return NextResponse.json({ error: 'Failed to handle reaction' }, { status: 500 })
  }
}

// GET reactions for a project
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const reactions = await prisma.reaction.findMany({
      where: { projectId },
      select: {
        reactionType: true,
        userId: true,
      },
    })

    // Aggregate reactions
    const counts = reactions.reduce(
      (acc, r) => {
        acc[r.reactionType] = (acc[r.reactionType] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({ counts, reactions })
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
  }
}
