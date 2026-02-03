import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Project, ProjectJoin, User, AppState } from '@/models'

// POST toggle join (join if not joined, leave if already joined)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check app state
    const appState = await AppState.findByPk('singleton')

    if (appState && appState.stage !== 'RECEIVING_SUBMISSIONS' && !appState.testMode) {
      return NextResponse.json(
        { error: 'Joining projects is closed' },
        { status: 403 }
      )
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

    // Check if already joined
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
