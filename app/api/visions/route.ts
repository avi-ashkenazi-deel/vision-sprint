import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Vision, User, VisionLike, Project } from '@/models'

// GET all visions
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    const visions = await Vision.findAll({
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'image'],
        },
        {
          model: VisionLike,
          as: 'likes',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'image'],
            },
          ],
        },
        {
          model: Project,
          as: 'projects',
        },
      ],
      order: [['createdAt', 'DESC']],
    })

    // Add hasLiked flag and counts for current user
    const visionsWithStatus = visions.map((vision) => {
      const visionData = vision.toJSON() as typeof vision & {
        likes: { userId: string }[]
        projects: unknown[]
      }
      return {
        ...visionData,
        _count: {
          likes: visionData.likes?.length || 0,
          projects: visionData.projects?.length || 0,
        },
        hasLiked: session?.user?.id
          ? visionData.likes?.some((like) => like.userId === session.user.id)
          : false,
      }
    })

    // Sort by likes count
    visionsWithStatus.sort((a, b) => b._count.likes - a._count.likes)

    return NextResponse.json(visionsWithStatus)
  } catch (error) {
    console.error('Error fetching visions:', error)
    return NextResponse.json({ error: 'Failed to fetch visions' }, { status: 500 })
  }
}

// POST create new vision (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create visions
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Only admins can create visions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, area, docUrl, kpis } = body

    if (!title || !description || !area) {
      return NextResponse.json(
        { error: 'Missing required fields (title, description, area)' },
        { status: 400 }
      )
    }

    const vision = await Vision.create({
      title,
      description,
      area,
      docUrl: docUrl || null,
      kpis: kpis || null,
      createdById: session.user.id,
    })

    const visionWithDetails = await Vision.findByPk(vision.id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'image'],
        },
      ],
    })

    return NextResponse.json({
      ...visionWithDetails?.toJSON(),
      likes: [],
      _count: { likes: 0, projects: 0 },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating vision:', error)
    return NextResponse.json({ error: 'Failed to create vision' }, { status: 500 })
  }
}
