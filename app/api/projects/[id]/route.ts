import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET single project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        teams: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
            submission: true,
          },
        },
        reactions: true,
        _count: {
          select: {
            votes: true,
            reactions: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...project,
      hasVoted: session?.user?.id
        ? project.votes.some((vote) => vote.userId === session.user.id)
        : false,
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

// PUT update project
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user is creator or admin
    if (project.creatorId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check app state for what can be edited
    const appState = await prisma.appState.findUnique({
      where: { id: 'singleton' },
    })

    const body = await request.json()

    // During sprint, only allow editing slack channel and doc link
    if (appState?.stage === 'EXECUTING_SPRINT' && !appState.testMode) {
      const { slackChannel, docLink } = body
      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          ...(slackChannel && { slackChannel }),
          ...(docLink !== undefined && { docLink }),
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      })
      return NextResponse.json(updatedProject)
    }

    // During sprint over, nothing is editable
    if (appState?.stage === 'SPRINT_OVER' && !appState.testMode) {
      return NextResponse.json(
        { error: 'Editing is disabled after sprint ends' },
        { status: 403 }
      )
    }

    // Full edit during submissions phase
    const { name, description, pitchVideoUrl, docLink, projectType, slackChannel } = body

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(pitchVideoUrl !== undefined && { pitchVideoUrl }),
        ...(docLink !== undefined && { docLink }),
        ...(projectType && { projectType }),
        ...(slackChannel && { slackChannel }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

// DELETE project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user is creator or admin
    if (project.creatorId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check app state
    const appState = await prisma.appState.findUnique({
      where: { id: 'singleton' },
    })

    if (appState && appState.stage !== 'RECEIVING_SUBMISSIONS' && !appState.testMode) {
      return NextResponse.json(
        { error: 'Deleting projects is disabled during sprint' },
        { status: 403 }
      )
    }

    await prisma.project.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
