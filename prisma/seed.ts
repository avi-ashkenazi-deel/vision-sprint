import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ProjectType = 'MOONSHOT' | 'SMALL_FEATURE' | 'DELIGHT' | 'EFFICIENCY'

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data
  await prisma.watchedVideo.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.vote.deleteMany()
  await prisma.project.deleteMany()
  await prisma.appState.deleteMany()

  console.log('🧹 Cleared existing data')

  // Create app state
  await prisma.appState.create({
    data: {
      id: 'singleton',
      stage: 'RECEIVING_SUBMISSIONS',
      sprintStartDate: new Date('2026-03-02T09:00:00Z'),
      sprintEndDate: new Date('2026-03-03T18:00:00Z'),
      testMode: true, // Enable test mode by default for development
    },
  })

  console.log('✅ Created app state with test mode enabled')

  // Get existing users or create test users if none exist
  let users = await prisma.user.findMany({ take: 10 })
  
  if (users.length === 0) {
    console.log('📝 No users found. Creating test users...')
    
    // Create some test users
    const testUsers = [
      { name: 'Alice Johnson', email: 'alice@example.com', isAdmin: true },
      { name: 'Bob Smith', email: 'bob@example.com', isAdmin: false },
      { name: 'Charlie Brown', email: 'charlie@example.com', isAdmin: false },
      { name: 'Diana Prince', email: 'diana@example.com', isAdmin: false },
      { name: 'Eve Wilson', email: 'eve@example.com', isAdmin: false },
      { name: 'Frank Miller', email: 'frank@example.com', isAdmin: false },
    ]

    for (const userData of testUsers) {
      await prisma.user.create({
        data: userData,
      })
    }

    users = await prisma.user.findMany({ take: 10 })
    console.log(`✅ Created ${users.length} test users`)
  } else {
    // Make the first user an admin if not already
    if (!users[0].isAdmin) {
      await prisma.user.update({
        where: { id: users[0].id },
        data: { isAdmin: true },
      })
      console.log(`✅ Made ${users[0].name} an admin`)
    }
  }

  // Sample projects
  const projectData: {
    name: string
    description: string
    projectType: ProjectType
    slackChannel: string
    pitchVideoUrl?: string
    docLink?: string
  }[] = [
    {
      name: 'AI Code Review Assistant',
      description: 'An intelligent code review tool that uses machine learning to automatically detect bugs, security vulnerabilities, and code quality issues. It integrates seamlessly with GitHub and GitLab, providing inline suggestions and detailed explanations for each finding.',
      projectType: 'MOONSHOT',
      slackChannel: 'ai-code-review',
      pitchVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      docLink: 'https://docs.google.com/document/d/example1',
    },
    {
      name: 'One-Click Deploy Button',
      description: 'Add a simple deploy button to all internal tools that allows anyone to deploy to staging with a single click. Includes automatic rollback functionality and Slack notifications.',
      projectType: 'SMALL_FEATURE',
      slackChannel: 'one-click-deploy',
      docLink: 'https://figma.com/file/example2',
    },
    {
      name: 'Dark Mode for Dashboard',
      description: 'Implement a beautiful dark mode theme for our main dashboard. Includes smooth transitions, automatic detection of system preferences, and a manual toggle in the settings.',
      projectType: 'DELIGHT',
      slackChannel: 'dark-mode',
    },
    {
      name: 'Automated Report Generator',
      description: 'Replace manual weekly report creation with an automated system that pulls data from Jira, GitHub, and Slack to generate comprehensive team reports. Saves approximately 2 hours per team lead per week.',
      projectType: 'EFFICIENCY',
      slackChannel: 'auto-reports',
      docLink: 'https://docs.google.com/document/d/example3',
    },
    {
      name: 'Voice-Controlled IDE',
      description: 'Develop an experimental voice control interface for VS Code that allows developers to write code, navigate files, and execute commands using natural language voice commands.',
      projectType: 'MOONSHOT',
      slackChannel: 'voice-ide',
      pitchVideoUrl: 'https://www.youtube.com/watch?v=example',
    },
    {
      name: 'Emoji Status Sync',
      description: 'Automatically sync your Slack status emoji based on your calendar events. In a meeting? 📅 On PTO? 🏖️ Focusing? 🎯 Never manually update your status again!',
      projectType: 'DELIGHT',
      slackChannel: 'emoji-status',
    },
  ]

  console.log('📝 Creating sample projects...')

  for (let i = 0; i < projectData.length; i++) {
    const creator = users[i % users.length]
    
    const project = await prisma.project.create({
      data: {
        name: projectData[i].name,
        description: projectData[i].description,
        projectType: projectData[i].projectType,
        slackChannel: projectData[i].slackChannel,
        pitchVideoUrl: projectData[i].pitchVideoUrl || null,
        docLink: projectData[i].docLink || null,
        creatorId: creator.id,
      },
    })

    // Add some random votes
    const voterCount = Math.floor(Math.random() * users.length) + 1
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5)
    
    for (let j = 0; j < voterCount; j++) {
      if (shuffledUsers[j].id !== creator.id) {
        await prisma.vote.create({
          data: {
            userId: shuffledUsers[j].id,
            projectId: project.id,
          },
        })
      }
    }

    console.log(`✅ Created project: ${project.name} with ${voterCount} votes`)
  }

  console.log('')
  console.log('🎉 Seed completed successfully!')
  console.log('')
  console.log('📋 Summary:')
  console.log(`   - ${users.length} users`)
  console.log(`   - ${projectData.length} projects`)
  console.log(`   - Test mode is ENABLED`)
  console.log('')
  console.log('🔑 Admin users can access /admin to change stages and form teams')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
