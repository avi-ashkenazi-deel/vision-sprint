import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Project, User, Vote, Team, TeamMember, Submission, Vision, ProjectJoin, AppState, Sprint } from '@/models'
import { validateVideoDuration } from '@/lib/google-drive'

// GET all projects
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    // Support sprintId query param; default to current sprint
    const { searchParams } = new URL(request.url)
    let sprintId = searchParams.get('sprintId')

    if (!sprintId) {
      const appState = await AppState.findByPk('singleton')
      sprintId = appState?.currentSprintId || null
    }

    const whereClause: Record<string, unknown> = {}
    if (sprintId) {
      whereClause.sprintId = sprintId
    }

    const projects = await Project.findAll({
      where: whereClause,
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
      ],
      order: [['createdAt', 'DESC']],
    })

    // Transform to match expected format
    const projectsWithStatus = projects.map((project) => {
      const projectData = project.toJSON() as typeof project & {
        votes: { userId: string; user: { id: string; name: string; image: string } }[]
        joins: { userId: string; user: { id: string; name: string; image: string } }[]
        reactions: unknown[]
      }
      return {
        ...projectData,
        _count: {
          votes: projectData.votes?.length || 0,
          reactions: 0, // Will be fetched separately if needed
          joins: projectData.joins?.length || 0,
        },
        hasVoted: session?.user?.id
          ? projectData.votes?.some((vote) => vote.userId === session.user.id)
          : false,
        hasJoined: session?.user?.id
          ? projectData.joins?.some((join) => join.userId === session.user.id)
          : false,
      }
    })

    // Sort by vote count
    projectsWithStatus.sort((a, b) => b._count.votes - a._count.votes)

    return NextResponse.json(projectsWithStatus)
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

    // Check app state — get the current sprint to validate stage
    let appState: AppState | null
    let currentSprint: Sprint | null = null
    try {
      appState = await AppState.findByPk('singleton', {
        include: [{ model: Sprint, as: 'currentSprint' }],
      })
      currentSprint = appState?.currentSprint ?? null
    } catch {
      // Sprint table may not exist yet (pre-migration)
      appState = await AppState.findByPk('singleton')
    }

    // Check stage from sprint or raw appState (pre-migration fallback)
    const currentStage = currentSprint?.stage || (appState as any)?.stage
    if (currentStage && currentStage !== 'RECEIVING_SUBMISSIONS' && !appState?.testMode) {
      return NextResponse.json(
        { error: 'Project submissions are closed' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, pitchVideoUrl, docLink, projectType, slackChannel, businessRationale, visionId, department } = body

    if (!name || !description || !projectType || !slackChannel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    const project = await Project.create({
      name,
      description,
      pitchVideoUrl: pitchVideoUrl || null,
      docLink: docLink || null,
      projectType,
      slackChannel,
      businessRationale: businessRationale || null,
      visionId: visionId || null,
      department: department || null,
      creatorId: session.user.id,
      sprintId: currentSprint?.id || appState?.currentSprintId || null,
    })

    // Fetch with creator included
    const projectWithCreator = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'image'],
        },
      ],
    })

    const projectData = projectWithCreator?.toJSON()
    return NextResponse.json({
      ...projectData,
      votes: [],
      _count: { votes: 0 },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
