import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST create team (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, teamName, memberIds } = body

    if (!projectId || !teamName || !memberIds || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'Project ID, team name, and member IDs required' },
        { status: 400 }
      )
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { teams: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Determine team number
    const teamNumber = project.teams.length + 1

    // Create team with members
    const team = await prisma.team.create({
      data: {
        projectId,
        teamName,
        teamNumber,
        members: {
          create: memberIds.map((userId: string) => ({
            userId,
          })),
        },
      },
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
      },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

// GET all teams
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectType: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}
