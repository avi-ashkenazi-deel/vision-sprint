import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sprint, AppState, AppStage } from '@/models'

// GET all sprints (ordered by createdAt DESC)
export async function GET() {
  try {
    const sprints = await Sprint.findAll({
      order: [['createdAt', 'DESC']],
    })

    return NextResponse.json(sprints.map((s) => s.toJSON()))
  } catch (error) {
    // Sprint table may not exist yet (pre-migration) — return empty list
    console.error('Error fetching sprints:', error)
    return NextResponse.json([])
  }
}

// POST create a new sprint (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, submissionEndDate, sprintStartDate, sprintEndDate, setAsCurrent } = body

    if (!name) {
      return NextResponse.json({ error: 'Sprint name is required' }, { status: 400 })
    }

    const sprint = await Sprint.create({
      name,
      stage: AppStage.RECEIVING_SUBMISSIONS,
      submissionEndDate: submissionEndDate ? new Date(submissionEndDate) : null,
      sprintStartDate: sprintStartDate ? new Date(sprintStartDate) : null,
      sprintEndDate: sprintEndDate ? new Date(sprintEndDate) : null,
    })

    // Optionally set as the current sprint
    if (setAsCurrent) {
      const appState = await AppState.findByPk('singleton')
      if (appState) {
        await appState.update({ currentSprintId: sprint.id })
      }
    }

    return NextResponse.json(sprint.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Error creating sprint:', error)
    return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 })
  }
}
