import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST duplicate a project for multiple teams
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const originalProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teams: true,
      },
    })

    if (!originalProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Count existing teams to determine the team number
    const teamCount = originalProject.teams.length

    // Create a duplicate project with incremented name
    const duplicatedProject = await prisma.project.create({
      data: {
        name: `${originalProject.name} (Team ${teamCount + 2})`,
        description: originalProject.description,
        pitchVideoUrl: originalProject.pitchVideoUrl,
        docLink: originalProject.docLink,
        projectType: originalProject.projectType,
        slackChannel: `${originalProject.slackChannel}-${teamCount + 2}`,
        creatorId: originalProject.creatorId,
      },
    })

    // Update original project name if this is the first duplicate
    if (teamCount === 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          name: `${originalProject.name} (Team 1)`,
        },
      })
    }

    return NextResponse.json(duplicatedProject, { status: 201 })
  } catch (error) {
    console.error('Error duplicating project:', error)
    return NextResponse.json({ error: 'Failed to duplicate project' }, { status: 500 })
  }
}
