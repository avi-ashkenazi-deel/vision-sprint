import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Project, ProjectJoin, User, AppState, Sprint } from '@/models'

const MAX_JOINS = 2

// POST toggle join (join if not joined, leave if already joined)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Check if project exists
    const project = await Project.findByPk(projectId)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if already joined this project
    const existingJoin = await ProjectJoin.findOne({
      where: {
        userId: session.user.id,
        projectId,
      },
    })

    if (existingJoin) {
      // Toggle off - remove join
      await existingJoin.destroy()
      return NextResponse.json({ joined: false })
    }

    // Count how many projects user has already joined in the current sprint
    const appState = await AppState.findByPk('singleton')
    const currentSprintId = appState?.currentSprintId

    let joinCountWhere: Record<string, unknown> = { userId: session.user.id }
    if (currentSprintId) {
      // Only count joins for projects in the current sprint
      joinCountWhere = { userId: session.user.id }
    }

    const currentJoinCount = await ProjectJoin.count({
      where: { userId: session.user.id },
      include: currentSprintId ? [{
        model: Project,
        as: 'project',
        where: { sprintId: currentSprintId },
        attributes: [],
      }] : [],
    })

    if (currentJoinCount >= MAX_JOINS) {
      // Return the list of currently joined projects so the frontend can offer a swap
      const currentJoins = await ProjectJoin.findAll({
        where: { userId: session.user.id },
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'name'],
          },
        ],
      })

      return NextResponse.json({
        error: `You can join a maximum of ${MAX_JOINS} projects. Leave one to join another.`,
        maxReached: true,
        currentJoins: currentJoins.map((j) => {
          const data = j.toJSON() as { projectId: string; project?: { id: string; name: string } }
          return { projectId: data.projectId, projectName: data.project?.name || 'Unknown' }
        }),
      }, { status: 409 })
    }

    // Create new join
    const join = await ProjectJoin.create({
      userId: session.user.id,
      projectId,
    })

    const joinWithUser = await ProjectJoin.findByPk(join.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'image'],
        },
      ],
    })

    return NextResponse.json({ joined: true, join: joinWithUser?.toJSON() }, { status: 201 })
  } catch (error) {
    console.error('Error toggling join:', error)
    return NextResponse.json({ error: 'Failed to toggle join' }, { status: 500 })
  }
}

// GET joins for a project
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const joins = await ProjectJoin.findAll({
      where: { projectId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'image'],
        },
      ],
      order: [['createdAt', 'DESC']],
    })

    // Check if current user has joined
    const session = await getServerSession(authOptions)
    const joinsData = joins.map((j) => j.toJSON()) as { userId: string }[]
    const hasJoined = session?.user?.id
      ? joinsData.some((join) => join.userId === session.user.id)
      : false

    return NextResponse.json({ joins: joinsData, hasJoined, count: joinsData.length })
  } catch (error) {
    console.error('Error fetching joins:', error)
    return NextResponse.json({ error: 'Failed to fetch joins' }, { status: 500 })
  }
}
