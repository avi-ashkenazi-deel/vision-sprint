import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Submission, TeamMember, AppState } from '@/models'

// POST create/update submission
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check app state
    const appState = await AppState.findByPk('singleton')

    if (appState && appState.stage !== 'EXECUTING_SPRINT' && !appState.testMode) {
      return NextResponse.json(
        { error: 'Submissions are only allowed during the sprint' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { teamId, videoUrl } = body

    if (!teamId || !videoUrl) {
      return NextResponse.json(
        { error: 'Team ID and video URL required' },
        { status: 400 }
      )
    }

    // Check if user is a member of this team
    const teamMember = await TeamMember.findOne({
      where: {
        teamId,
        userId: session.user.id,
      },
    })

    if (!teamMember && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'You must be a team member to submit' },
        { status: 403 }
      )
    }

    // Create or update submission
    let submission = await Submission.findOne({ where: { teamId } })

    if (submission) {
      await submission.update({ videoUrl })
    } else {
      submission = await Submission.create({
        teamId,
        videoUrl,
      })
    }

    return NextResponse.json(submission.toJSON())
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
  }
}
