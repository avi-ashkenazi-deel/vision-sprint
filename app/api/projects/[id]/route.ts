import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Project, User, Vote, Team, TeamMember, Submission, Vision, ProjectJoin, Reaction, AppState } from '@/models'
import { validateVideoDuration } from '@/lib/google-drive'

// GET single project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const project = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'image'],
        },
        {
          model: Vision,
          as: 'vision',
          attributes: ['id', 'title', 'area'],
        },
        {
          model: Vote,
          as: 'votes',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'image'],
            },
          ],
        },
        {
          model: ProjectJoin,
          as: 'joins',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'image'],
            },
          ],
        },
        {
          model: Team,
          as: 'teams',
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
            {
              model: Submission,
              as: 'submission',
            },
          ],
        },
        {
          model: Reaction,
          as: 'reactions',
        },
      ],
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const projectData = project.toJSON() as typeof project & {
      votes: { userId: string }[]
      joins: { userId: string }[]
      reactions: unknown[]
    }

    return NextResponse.json({
      ...projectData,
      _count: {
        votes: projectData.votes?.length || 0,
        reactions: projectData.reactions?.length || 0,
        joins: projectData.joins?.length || 0,
      },
      hasVoted: session?.user?.id
        ? projectData.votes?.some((vote) => vote.userId === session.user.id)
        : false,
      hasJoined: session?.user?.id
        ? projectData.joins?.some((join) => join.userId === session.user.id)
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

    const project = await Project.findByPk(id)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user is creator or admin
    if (project.creatorId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check app state for what can be edited
    const appState = await AppState.findByPk('singleton')

    const body = await request.json()

    // During sprint, only allow editing slack channel and doc link
    if (appState?.stage === 'EXECUTING_SPRINT' && !appState.testMode) {
      const { slackChannel, docLink } = body
      await project.update({
        ...(slackChannel && { slackChannel }),
        ...(docLink !== undefined && { docLink }),
      })
      
      const updatedProject = await Project.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'image'],
          },
        ],
      })
      return NextResponse.json(updatedProject?.toJSON())
    }

    // During sprint over, nothing is editable
    if (appState?.stage === 'SPRINT_OVER' && !appState.testMode) {
      return NextResponse.json(
        { error: 'Editing is disabled after sprint ends' },
        { status: 403 }
      )
    }

    // Full edit during submissions phase
    const { name, description, pitchVideoUrl, docLink, projectType, slackChannel, businessRationale, visionId, department } = body

    // Validate video duration if a pitch video URL is provided
    if (pitchVideoUrl && session.accessToken) {
      const videoCheck = await validateVideoDuration(pitchVideoUrl, session.accessToken)
      if (!videoCheck.valid) {
        return NextResponse.json(
          { error: videoCheck.error },
          { status: 400 }
        )
      }
    }

    await project.update({
      ...(name && { name }),
      ...(description && { description }),
      ...(pitchVideoUrl !== undefined && { pitchVideoUrl }),
      ...(docLink !== undefined && { docLink }),
      ...(projectType && { projectType }),
      ...(slackChannel && { slackChannel }),
      ...(businessRationale !== undefined && { businessRationale }),
      ...(visionId !== undefined && { visionId }),
      ...(department !== undefined && { department }),
    })

    const updatedProject = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'image'],
        },
        {
          model: Vote,
          as: 'votes',
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

    return NextResponse.json(updatedProject?.toJSON())
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

    const project = await Project.findByPk(id)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user is creator or admin
    if (project.creatorId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check app state
    const appState = await AppState.findByPk('singleton')

    if (appState && appState.stage !== 'RECEIVING_SUBMISSIONS' && !appState.testMode) {
      return NextResponse.json(
        { error: 'Deleting projects is disabled during sprint' },
        { status: 403 }
      )
    }

    await project.destroy()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
