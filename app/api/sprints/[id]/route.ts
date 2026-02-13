import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sprint, AppStage } from '@/models'

// GET single sprint
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sprint = await Sprint.findByPk(id)

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }

    return NextResponse.json(sprint.toJSON())
  } catch (error) {
    console.error('Error fetching sprint:', error)
    return NextResponse.json({ error: 'Failed to fetch sprint' }, { status: 500 })
  }
}

// PUT update sprint (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sprint = await Sprint.findByPk(id)

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, stage, submissionEndDate, sprintStartDate, sprintEndDate } = body

    await sprint.update({
      ...(name && { name }),
      ...(stage && Object.values(AppStage).includes(stage) && { stage }),
      ...('submissionEndDate' in body && { submissionEndDate: submissionEndDate ? new Date(submissionEndDate) : null }),
      ...('sprintStartDate' in body && { sprintStartDate: sprintStartDate ? new Date(sprintStartDate) : null }),
      ...('sprintEndDate' in body && { sprintEndDate: sprintEndDate ? new Date(sprintEndDate) : null }),
    })

    return NextResponse.json(sprint.toJSON())
  } catch (error) {
    console.error('Error updating sprint:', error)
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 })
  }
}
