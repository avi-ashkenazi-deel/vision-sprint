import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Vision, User, VisionLike, Project, Vote } from '@/models'

// GET single vision
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const vision = await Vision.findByPk(id, {
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
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'image'],
            },
            {
              model: Vote,
              as: 'votes',
            },
          ],
        },
      ],
    })

    if (!vision) {
      return NextResponse.json({ error: 'Vision not found' }, { status: 404 })
    }

    const visionData = vision.toJSON() as typeof vision & {
      likes: { userId: string }[]
      projects: { votes: unknown[] }[]
    }

    // Transform projects to include _count
    const projectsWithCount = visionData.projects?.map((p) => ({
      ...p,
      _count: { votes: p.votes?.length || 0 },
    }))

    const visionWithStatus = {
      ...visionData,
      projects: projectsWithCount,
      _count: {
        likes: visionData.likes?.length || 0,
        projects: visionData.projects?.length || 0,
      },
      hasLiked: session?.user?.id
        ? visionData.likes?.some((like) => like.userId === session.user.id)
        : false,
    }

    return NextResponse.json(visionWithStatus)
  } catch (error) {
    console.error('Error fetching vision:', error)
    return NextResponse.json({ error: 'Failed to fetch vision' }, { status: 500 })
  }
}

// PUT update vision (admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Only admins can update visions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, area, docUrl, kpis } = body

    const vision = await Vision.findByPk(id)
    if (!vision) {
      return NextResponse.json({ error: 'Vision not found' }, { status: 404 })
    }

    await vision.update({
      ...(title && { title }),
      ...(description && { description }),
      ...(area && { area }),
      ...(docUrl !== undefined && { docUrl }),
      ...(kpis !== undefined && { kpis }),
    })

    const updatedVision = await Vision.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'image'],
        },
        {
          model: VisionLike,
          as: 'likes',
        },
      ],
    })

    const visionData = updatedVision?.toJSON() as typeof updatedVision & { likes: unknown[] }

    return NextResponse.json({
      ...visionData,
      _count: {
        likes: visionData?.likes?.length || 0,
        projects: 0,
      },
    })
  } catch (error) {
    console.error('Error updating vision:', error)
    return NextResponse.json({ error: 'Failed to update vision' }, { status: 500 })
  }
}

// DELETE vision (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Only admins can delete visions' }, { status: 403 })
    }

    const vision = await Vision.findByPk(id)
    if (!vision) {
      return NextResponse.json({ error: 'Vision not found' }, { status: 404 })
    }

    await vision.destroy()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vision:', error)
    return NextResponse.json({ error: 'Failed to delete vision' }, { status: 500 })
  }
}
