import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Project, Team, TeamMember, User, Submission } from '@/models'

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
    const project = await Project.findByPk(projectId, {
      include: [{ model: Team, as: 'teams' }],
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Determine team number
    const projectData = project.toJSON() as typeof project & { teams: unknown[] }
    const teamNumber = (projectData.teams?.length || 0) + 1

    // Create team
    const team = await Team.create({
      projectId,
      teamName,
      teamNumber,
    })

    // Create team members
    for (const userId of memberIds) {
      await TeamMember.create({
        teamId: team.id,
        userId,
      })
    }

    // Fetch team with members
    const teamWithMembers = await Team.findByPk(team.id, {
      include: [
        {
          model: TeamMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'image'],
            },
          ],
        },
      ],
    })

    return NextResponse.json(teamWithMembers?.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}

// GET all teams
export async function GET() {
  try {
    const teams = await Team.findAll({
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'projectType'],
        },
        {
          model: TeamMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'image'],
            },
          ],
        },
        {
          model: Submission,
          as: 'submission',
        },
      ],
      order: [['createdAt', 'DESC']],
    })

    return NextResponse.json(teams.map((t) => t.toJSON()))
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}
