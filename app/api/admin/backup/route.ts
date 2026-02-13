import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  AppState,
  Sprint,
  User,
  Project,
  Vote,
  ProjectJoin,
  Team,
  TeamMember,
  Submission,
  Reaction,
  WatchedVideo,
  Vision,
  VisionLike,
} from '@/models'

// GET /api/admin/backup — export all database tables as JSON (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query all tables in parallel
    const [
      appState,
      sprints,
      users,
      projects,
      votes,
      projectJoins,
      teams,
      teamMembers,
      submissions,
      reactions,
      watchedVideos,
      visions,
      visionLikes,
    ] = await Promise.all([
      AppState.findAll({ raw: true }),
      Sprint.findAll({ raw: true, order: [['createdAt', 'DESC']] }),
      User.findAll({
        raw: true,
        attributes: { exclude: [] }, // Include all fields for backup
      }),
      Project.findAll({ raw: true, order: [['createdAt', 'DESC']] }),
      Vote.findAll({ raw: true }),
      ProjectJoin.findAll({ raw: true }),
      Team.findAll({ raw: true }),
      TeamMember.findAll({ raw: true }),
      Submission.findAll({ raw: true }),
      Reaction.findAll({ raw: true }),
      WatchedVideo.findAll({ raw: true }),
      Vision.findAll({ raw: true, order: [['createdAt', 'DESC']] }),
      VisionLike.findAll({ raw: true }),
    ])

    const backup = {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0',
      tables: {
        appState,
        sprints,
        users,
        projects,
        votes,
        projectJoins,
        teams,
        teamMembers,
        submissions,
        reactions,
        watchedVideos,
        visions,
        visionLikes,
      },
    }

    const jsonString = JSON.stringify(backup, null, 2)
    const today = new Date().toISOString().split('T')[0]

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=visionsprint-backup-${today}.json`,
      },
    })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}
