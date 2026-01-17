import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET current app state
export async function GET() {
  try {
    let appState = await prisma.appState.findUnique({
      where: { id: 'singleton' },
    })

    // Create default state if doesn't exist
    if (!appState) {
      appState = await prisma.appState.create({
        data: {
          id: 'singleton',
          stage: 'RECEIVING_SUBMISSIONS',
          sprintStartDate: new Date('2026-03-02T09:00:00Z'),
          sprintEndDate: new Date('2026-03-03T18:00:00Z'),
          testMode: false,
        },
      })
    }

    return NextResponse.json(appState)
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
    const { stage, sprintStartDate, sprintEndDate, testMode } = body

    const appState = await prisma.appState.upsert({
      where: { id: 'singleton' },
      update: {
        ...(stage && { stage }),
        ...(sprintStartDate && { sprintStartDate: new Date(sprintStartDate) }),
        ...(sprintEndDate && { sprintEndDate: new Date(sprintEndDate) }),
        ...(typeof testMode === 'boolean' && { testMode }),
      },
      create: {
        id: 'singleton',
        stage: stage || 'RECEIVING_SUBMISSIONS',
        sprintStartDate: sprintStartDate ? new Date(sprintStartDate) : new Date('2026-03-02T09:00:00Z'),
        sprintEndDate: sprintEndDate ? new Date(sprintEndDate) : new Date('2026-03-03T18:00:00Z'),
        testMode: testMode || false,
      },
    })

    return NextResponse.json(appState)
  } catch (error) {
    console.error('Error updating app state:', error)
    return NextResponse.json({ error: 'Failed to update app state' }, { status: 500 })
  }
}
