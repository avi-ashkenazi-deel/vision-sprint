import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppState, AppStage } from '@/models'

// GET current app state
export async function GET() {
  try {
    let appState = await AppState.findByPk('singleton')

    // Create default state if doesn't exist
    if (!appState) {
      appState = await AppState.create({
        id: 'singleton',
        stage: AppStage.RECEIVING_SUBMISSIONS,
        submissionEndDate: new Date('2026-02-28T18:00:00Z'),
        sprintStartDate: new Date('2026-03-02T09:00:00Z'),
        sprintEndDate: new Date('2026-03-03T18:00:00Z'),
        testMode: false,
      })
    }

    return NextResponse.json(appState.toJSON())
  } catch (error) {
    console.error('Error fetching app state:', error)
    return NextResponse.json({ error: 'Failed to fetch app state' }, { status: 500 })
  }
}

// PUT update app state (admin only)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stage, submissionEndDate, sprintStartDate, sprintEndDate, testMode } = body

    let appState = await AppState.findByPk('singleton')

    if (appState) {
      await appState.update({
        ...(stage && { stage }),
        ...(submissionEndDate && { submissionEndDate: new Date(submissionEndDate) }),
        ...(sprintStartDate && { sprintStartDate: new Date(sprintStartDate) }),
        ...(sprintEndDate && { sprintEndDate: new Date(sprintEndDate) }),
        ...(typeof testMode === 'boolean' && { testMode }),
      })
    } else {
      appState = await AppState.create({
        id: 'singleton',
        stage: stage || AppStage.RECEIVING_SUBMISSIONS,
        submissionEndDate: submissionEndDate ? new Date(submissionEndDate) : new Date('2026-02-28T18:00:00Z'),
        sprintStartDate: sprintStartDate ? new Date(sprintStartDate) : new Date('2026-03-02T09:00:00Z'),
        sprintEndDate: sprintEndDate ? new Date(sprintEndDate) : new Date('2026-03-03T18:00:00Z'),
        testMode: testMode || false,
      })
    }

    return NextResponse.json(appState.toJSON())
  } catch (error) {
    console.error('Error updating app state:', error)
    return NextResponse.json({ error: 'Failed to update app state' }, { status: 500 })
  }
}
