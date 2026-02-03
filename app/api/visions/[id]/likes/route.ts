import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Vision, VisionLike, User } from '@/models'

// POST - Like a vision
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: visionId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if vision exists
    const vision = await Vision.findByPk(visionId)

    if (!vision) {
      return NextResponse.json({ error: 'Vision not found' }, { status: 404 })
    }

    // Check if already liked
    const existingLike = await VisionLike.findOne({
      where: {
        userId: session.user.id,
        visionId,
      },
    })

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked this vision' }, { status: 400 })
    }

    const like = await VisionLike.create({
      userId: session.user.id,
      visionId,
    })

    const likeWithUser = await VisionLike.findByPk(like.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'image'],
        },
      ],
    })

    return NextResponse.json(likeWithUser?.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Error liking vision:', error)
    return NextResponse.json({ error: 'Failed to like vision' }, { status: 500 })
  }
}

// DELETE - Unlike a vision
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: visionId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if like exists
    const existingLike = await VisionLike.findOne({
      where: {
        userId: session.user.id,
        visionId,
      },
    })

    if (!existingLike) {
      return NextResponse.json({ error: 'Like not found' }, { status: 404 })
    }

    await existingLike.destroy()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unliking vision:', error)
    return NextResponse.json({ error: 'Failed to unlike vision' }, { status: 500 })
  }
}
