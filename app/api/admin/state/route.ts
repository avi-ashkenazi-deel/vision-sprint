import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppState, Sprint, AppStage } from '@/models'
import sequelize from '@/lib/db'

// Check if the Sprint table exists in the database
async function sprintTableExists(): Promise<boolean> {
  try {
    const qi = sequelize.getQueryInterface()
    const tables = await qi.showAllTables()
    return tables.includes('Sprint')
  } catch {
    return false
  }
}

// Helper to build a backwards-compatible response shape
function buildResponse(appState: Record<string, unknown>, sprint: Record<string, unknown> | null) {
  return {
    id: appState.id,
    currentSprintId: appState.currentSprintId ?? null,
    testMode: appState.testMode ?? false,
    // Backwards-compatible fields — prefer sprint, fall back to appState (pre-migration)
    stage: sprint?.stage || appState.stage || AppStage.RECEIVING_SUBMISSIONS,
    submissionEndDate: sprint?.submissionEndDate ?? appState.submissionEndDate ?? null,
    sprintStartDate: sprint?.sprintStartDate ?? appState.sprintStartDate ?? null,
    sprintEndDate: sprint?.sprintEndDate ?? appState.sprintEndDate ?? null,
    // Include full sprint object
    currentSprint: sprint || null,
    createdAt: appState.createdAt,
    updatedAt: appState.updatedAt,
  }
}

// GET current app state
export async function GET() {
  try {
    const hasSprints = await sprintTableExists()

    let appState: AppState | null
    if (hasSprints) {
      appState = await AppState.findByPk('singleton', {
        include: [{ model: Sprint, as: 'currentSprint' }],
      })
    } else {
      try {
        appState = await AppState.findByPk('singleton')
      } catch {
        appState = null
      }
    }

    // Create default state if doesn't exist
    if (!appState) {
      if (hasSprints) {
        // New schema: create sprint + appState
        const defaultSprint = await Sprint.create({
          name: 'Sprint 1',
          stage: AppStage.RECEIVING_SUBMISSIONS,
          submissionEndDate: null,
          sprintStartDate: null,
          sprintEndDate: null,
        })

        appState = await AppState.create({
          id: 'singleton',
          currentSprintId: defaultSprint.id,
          testMode: false,
        })

        appState = await AppState.findByPk('singleton', {
          include: [{ model: Sprint, as: 'currentSprint' }],
        })
      } else {
        // Pre-migration: create appState with old-style defaults via raw SQL
        await sequelize.query(
          `INSERT INTO "AppState" (id, stage, "testMode", "createdAt", "updatedAt")
           VALUES ('singleton', 'RECEIVING_SUBMISSIONS', false, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`
        )
        appState = await AppState.findByPk('singleton')
      }
    }

    const raw = appState!.toJSON() as unknown as Record<string, unknown>
    const sprint = hasSprints ? (appState as any)?.currentSprint?.toJSON?.() ?? (appState as any)?.currentSprint ?? null : null

    const response = buildResponse(raw, sprint)

    return NextResponse.json(response)
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
    const { stage, submissionEndDate, sprintStartDate, sprintEndDate, testMode, currentSprintId } = body

    const hasSprints = await sprintTableExists()

    let appState: AppState | null
    if (hasSprints) {
      appState = await AppState.findByPk('singleton', {
        include: [{ model: Sprint, as: 'currentSprint' }],
      })
    } else {
      appState = await AppState.findByPk('singleton')
    }

    if (!appState) {
      return NextResponse.json({ error: 'App state not found' }, { status: 404 })
    }

    if (hasSprints) {
      // New schema: update AppState-level fields
      const appStateUpdates: Record<string, unknown> = {}
      if (typeof testMode === 'boolean') appStateUpdates.testMode = testMode
      if (currentSprintId) appStateUpdates.currentSprintId = currentSprintId

      if (Object.keys(appStateUpdates).length > 0) {
        await appState.update(appStateUpdates)
      }

      // Update the current sprint's stage/dates if provided
      const sprint = (appState as any).currentSprint
      if (sprint) {
        const sprintUpdates: Record<string, unknown> = {}
        if (stage && Object.values(AppStage).includes(stage)) sprintUpdates.stage = stage
        if ('submissionEndDate' in body) sprintUpdates.submissionEndDate = submissionEndDate ? new Date(submissionEndDate) : null
        if ('sprintStartDate' in body) sprintUpdates.sprintStartDate = sprintStartDate ? new Date(sprintStartDate) : null
        if ('sprintEndDate' in body) sprintUpdates.sprintEndDate = sprintEndDate ? new Date(sprintEndDate) : null

        if (Object.keys(sprintUpdates).length > 0) {
          await sprint.update(sprintUpdates)
        }
      }

      // Reload to get fresh data
      appState = await AppState.findByPk('singleton', {
        include: [{ model: Sprint, as: 'currentSprint' }],
      })
    } else {
      // Pre-migration: update old-style columns via raw SQL
      const updates: string[] = []
      const replacements: Record<string, unknown> = {}

      if (stage) { updates.push('"stage" = :stage'); replacements.stage = stage }
      if ('submissionEndDate' in body) { updates.push('"submissionEndDate" = :submissionEndDate'); replacements.submissionEndDate = submissionEndDate ? new Date(submissionEndDate) : null }
      if ('sprintStartDate' in body) { updates.push('"sprintStartDate" = :sprintStartDate'); replacements.sprintStartDate = sprintStartDate ? new Date(sprintStartDate) : null }
      if ('sprintEndDate' in body) { updates.push('"sprintEndDate" = :sprintEndDate'); replacements.sprintEndDate = sprintEndDate ? new Date(sprintEndDate) : null }
      if (typeof testMode === 'boolean') { updates.push('"testMode" = :testMode'); replacements.testMode = testMode }

      if (updates.length > 0) {
        await sequelize.query(
          `UPDATE "AppState" SET ${updates.join(', ')}, "updatedAt" = NOW() WHERE id = 'singleton'`,
          { replacements }
        )
      }

      appState = await AppState.findByPk('singleton')
    }

    const raw = appState!.toJSON() as unknown as Record<string, unknown>
    const sprint = hasSprints ? (appState as any)?.currentSprint?.toJSON?.() ?? (appState as any)?.currentSprint ?? null : null

    return NextResponse.json(buildResponse(raw, sprint))
  } catch (error) {
    console.error('Error updating app state:', error)
    return NextResponse.json({ error: 'Failed to update app state' }, { status: 500 })
  }
}
