import 'dotenv/config'
import { 
  syncDatabase, 
  User, 
  Project, 
  Vote, 
  AppState,
  Sprint,
  Discipline,
  ProjectType,
  AppStage
} from '../models/index'

async function main() {
  console.log('Seeding database...')

  // Sync database first
  await syncDatabase({ alter: true })

  // Create admin user
  const [alice] = await User.findOrCreate({
    where: { email: 'alice@example.com' },
    defaults: {
      name: 'Alice Admin',
      email: 'alice@example.com',
      isAdmin: true,
      accessVerified: true,
      discipline: Discipline.PRODUCT,
    },
  })
  console.log('Created/found admin user:', alice.name)

  // Create regular user
  const [bob] = await User.findOrCreate({
    where: { email: 'bob@example.com' },
    defaults: {
      name: 'Bob Developer',
      email: 'bob@example.com',
      isAdmin: false,
      accessVerified: true,
      discipline: Discipline.DEV,
    },
  })
  console.log('Created/found regular user:', bob.name)

  // Create another user
  const [carol] = await User.findOrCreate({
    where: { email: 'carol@example.com' },
    defaults: {
      name: 'Carol Data',
      email: 'carol@example.com',
      isAdmin: false,
      accessVerified: true,
      discipline: Discipline.DATA,
    },
  })
  console.log('Created/found user:', carol.name)

  // Create or update sprint and app state
  const [sprint] = await Sprint.findOrCreate({
    where: { name: 'Sprint 1' },
    defaults: {
      name: 'Sprint 1',
      stage: AppStage.RECEIVING_SUBMISSIONS,
      sprintStartDate: new Date('2026-03-02T09:00:00Z'),
      sprintEndDate: new Date('2026-03-03T18:00:00Z'),
    },
  })

  await AppState.findOrCreate({
    where: { id: 'singleton' },
    defaults: {
      id: 'singleton',
      currentSprintId: sprint.id,
      testMode: false,
    },
  })
  console.log('Created/found sprint and app state')

  // Create sample projects
  const [project1] = await Project.findOrCreate({
    where: { name: 'AI-Powered Code Review' },
    defaults: {
      name: 'AI-Powered Code Review',
      description: 'An AI assistant that helps review code changes, suggest improvements, and catch potential bugs before they reach production.',
      projectType: ProjectType.MOONSHOT,
      slackChannel: '#ai-code-review',
      creatorId: alice.id,
      sprintId: sprint.id,
    },
  })
  console.log('Created/found project:', project1.name)

  const [project2] = await Project.findOrCreate({
    where: { name: 'Dark Mode Support' },
    defaults: {
      name: 'Dark Mode Support',
      description: 'Add system-preference-based dark mode to the application for better user experience.',
      projectType: ProjectType.DELIGHT,
      slackChannel: '#dark-mode',
      creatorId: bob.id,
      sprintId: sprint.id,
    },
  })
  console.log('Created/found project:', project2.name)

  // Create some votes
  await Vote.findOrCreate({
    where: { userId: bob.id, projectId: project1.id },
    defaults: { userId: bob.id, projectId: project1.id },
  })

  await Vote.findOrCreate({
    where: { userId: carol.id, projectId: project1.id },
    defaults: { userId: carol.id, projectId: project1.id },
  })

  await Vote.findOrCreate({
    where: { userId: alice.id, projectId: project2.id },
    defaults: { userId: alice.id, projectId: project2.id },
  })

  console.log('Created votes')

  console.log('Database seeded successfully!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Error seeding database:', error)
  process.exit(1)
})
