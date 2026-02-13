import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Project, User, Vote, AppState, Sprint } from '@/models'

// POST create vote
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check app state via current sprint (with pre-migration fallback)
    let appState: any
    try {
      appState = await AppState.findByPk('singleton', {
        include: [{ model: Sprint, as: 'currentSprint' }],
      })
    } catch {
      appState = await AppState.findByPk('singleton')
    }
    const currentStage = appState?.currentSprint?.stage || appState?.stage

    if (appState && currentStage !== 'RECEIVING_SUBMISSIONS' && !appState.testMode) {
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
    const project = await Project.findByPk(projectId)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if already voted
    const existingVote = await Vote.findOne({
      where: {
        userId: session.user.id,
        projectId,
      },
    })

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 })
    }

    const vote = await Vote.create({
      userId: session.user.id,
      projectId,
    })

    // Fetch with user included
    const voteWithUser = await Vote.findByPk(vote.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'image'],
        },
      ],
    })

    return NextResponse.json(voteWithUser?.toJSON(), { status: 201 })
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

    // Check app state via current sprint (with pre-migration fallback)
    let appState: any
    try {
      appState = await AppState.findByPk('singleton', {
        include: [{ model: Sprint, as: 'currentSprint' }],
      })
    } catch {
      appState = await AppState.findByPk('singleton')
    }
    const currentStage = appState?.currentSprint?.stage || appState?.stage

    if (appState && currentStage !== 'RECEIVING_SUBMISSIONS' && !appState.testMode) {
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

    const vote = await Vote.findOne({
      where: {
        userId: session.user.id,
        projectId,
      },
    })

    if (!vote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 })
    }

    await vote.destroy()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
  }
}
