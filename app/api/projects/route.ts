import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET all projects
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    const projects = await prisma.project.findMany({
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
        _count: {
          select: {
            votes: true,
            reactions: true,
          },
        },
      },
      orderBy: [
        { votes: { _count: 'desc' } },
        { createdAt: 'desc' },
      ],
    })

    // Add hasVoted flag for current user
    const projectsWithVoteStatus = projects.map((project) => ({
      ...project,
      hasVoted: session?.user?.id
        ? project.votes.some((vote) => vote.userId === session.user.id)
        : false,
    }))

    return NextResponse.json(projectsWithVoteStatus)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST create new project
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
        { error: 'Project submissions are closed' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, pitchVideoUrl, docLink, projectType, slackChannel } = body

    if (!name || !description || !projectType || !slackChannel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        pitchVideoUrl: pitchVideoUrl || null,
        docLink: docLink || null,
        projectType,
        slackChannel,
        creatorId: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        votes: true,
        _count: {
          select: {
            votes: true,
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
