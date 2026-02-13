import 'dotenv/config'
import sequelize from '../lib/db'
import { syncDatabase, Sprint, AppState, Project, AppStage } from '../models/index'

/**
 * Migration script: Multi-Sprint Support
 * 
 * This script:
 * 1. Syncs the database schema (adds Sprint table, sprintId on Project, currentSprintId on AppState)
 * 2. Reads the old AppState stage/dates from raw SQL (columns may still exist in DB)
 * 3. Creates a default Sprint from those values
 * 4. Backfills sprintId on all existing Projects
 * 5. Sets currentSprintId on AppState
 * 
 * Safe to run multiple times — it skips if a Sprint already exists.
 */
async function main() {
  console.log('=== Multi-Sprint Migration ===\n')

  // Step 1: Sync schema
  console.log('1. Syncing database schema...')
  await syncDatabase({ alter: true })
  console.log('   Schema synced.\n')

  // Step 2: Check if migration already ran
  const existingSprints = await Sprint.count()
  if (existingSprints > 0) {
    console.log('   Sprints already exist — skipping data migration.')
    console.log('   Done!')
    process.exit(0)
  }

  // Step 3: Read old AppState values from raw SQL (the old columns may still exist in the DB even though the model removed them)
  console.log('2. Reading old AppState values...')
  let oldStage = AppStage.RECEIVING_SUBMISSIONS
  let oldSubmissionEndDate: Date | null = null
  let oldSprintStartDate: Date | null = null
  let oldSprintEndDate: Date | null = null

  try {
    const [rows] = await sequelize.query(
      `SELECT "stage", "submissionEndDate", "sprintStartDate", "sprintEndDate" FROM "AppState" WHERE id = 'singleton' LIMIT 1`
    ) as [Array<{ stage?: string; submissionEndDate?: string; sprintStartDate?: string; sprintEndDate?: string }>, unknown]

    if (rows.length > 0) {
      const row = rows[0]
      if (row.stage && Object.values(AppStage).includes(row.stage as AppStage)) {
        oldStage = row.stage as AppStage
      }
      oldSubmissionEndDate = row.submissionEndDate ? new Date(row.submissionEndDate) : null
      oldSprintStartDate = row.sprintStartDate ? new Date(row.sprintStartDate) : null
      oldSprintEndDate = row.sprintEndDate ? new Date(row.sprintEndDate) : null
      console.log(`   Found: stage=${oldStage}, sprintEnd=${oldSprintEndDate}`)
    } else {
      console.log('   No AppState row found, using defaults.')
    }
  } catch (err) {
    console.log('   Could not read old columns (may already be removed), using defaults.')
  }

  // Step 4: Create default Sprint
  console.log('3. Creating default Sprint...')
  const now = new Date()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const sprintName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`

  const sprint = await Sprint.create({
    name: sprintName,
    stage: oldStage,
    submissionEndDate: oldSubmissionEndDate,
    sprintStartDate: oldSprintStartDate,
    sprintEndDate: oldSprintEndDate,
  })
  console.log(`   Created Sprint "${sprint.name}" (id: ${sprint.id})\n`)

  // Step 5: Backfill sprintId on all existing Projects
  console.log('4. Backfilling sprintId on existing Projects...')
  const [, affectedCount] = await sequelize.query(
    `UPDATE "Project" SET "sprintId" = :sprintId WHERE "sprintId" IS NULL`,
    { replacements: { sprintId: sprint.id } }
  )
  console.log(`   Updated projects.\n`)

  // Step 6: Set currentSprintId on AppState
  console.log('5. Setting currentSprintId on AppState...')
  const [appState] = await AppState.findOrCreate({
    where: { id: 'singleton' },
    defaults: { currentSprintId: sprint.id, testMode: false },
  })
  await appState.update({ currentSprintId: sprint.id })
  console.log(`   AppState.currentSprintId = ${sprint.id}\n`)

  // Step 7: Clean up old columns (optional — Sequelize alter won't remove them automatically)
  console.log('6. Cleaning up old columns from AppState...')
  try {
    await sequelize.query(`ALTER TABLE "AppState" DROP COLUMN IF EXISTS "stage"`)
    await sequelize.query(`ALTER TABLE "AppState" DROP COLUMN IF EXISTS "submissionEndDate"`)
    await sequelize.query(`ALTER TABLE "AppState" DROP COLUMN IF EXISTS "sprintStartDate"`)
    await sequelize.query(`ALTER TABLE "AppState" DROP COLUMN IF EXISTS "sprintEndDate"`)
    console.log('   Removed old stage/date columns from AppState.\n')
  } catch (err) {
    console.log('   Could not drop old columns (may already be gone).\n')
  }

  console.log('=== Migration complete! ===')
  process.exit(0)
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
