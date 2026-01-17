import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST create vote
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check app state
    const appState = await prisma.appState.findUnique({
      where: { id: 'singleton' },
    })

    if (appState && appState.stage !== 'RECEIVING_SUBMISSIONS' && !appState.testMode) {
      return NextResponse.json(
        { error: 'Voting is closed' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId,
        },
      },
    })

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 })
    }

    const vote = await prisma.vote.create({
      data: {
        userId: session.user.id,
        projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(vote, { status: 201 })
  } catch (error) {
    console.error('Error creating vote:', error)
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}

// DELETE remove vote
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check app state
    const appState = await prisma.appState.findUnique({
      where: { id: 'singleton' },
    })

    if (appState && appState.stage !== 'RECEIVING_SUBMISSIONS' && !appState.testMode) {
      return NextResponse.json(
        { error: 'Voting changes are closed' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const vote = await prisma.vote.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId,
        },
      },
    })

    if (!vote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 })
    }

    await prisma.vote.delete({
      where: { id: vote.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
  }
}
