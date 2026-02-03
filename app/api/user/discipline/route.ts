import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { User, Discipline } from '@/models'

const VALID_DISCIPLINES = ['DEV', 'PRODUCT', 'DATA', 'DESIGNER'] as const

// PUT - Set user discipline (only if not already set)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { discipline } = body

    if (!discipline || !VALID_DISCIPLINES.includes(discipline)) {
      return NextResponse.json(
        { error: 'Invalid discipline. Must be one of: DEV, PRODUCT, DATA, DESIGNER' },
        { status: 400 }
      )
    }

    // Check if user already has a discipline set
    const existingUser = await User.findByPk(session.user.id, {
      attributes: ['discipline'],
    })

    if (existingUser?.discipline) {
      return NextResponse.json(
        { error: 'Discipline already set and cannot be changed' },
        { status: 400 }
      )
    }

    // Update user discipline
    await User.update(
      { discipline: discipline as Discipline },
      { where: { id: session.user.id } }
    )

    const updatedUser = await User.findByPk(session.user.id, {
      attributes: ['id', 'name', 'email', 'discipline'],
      raw: true,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error setting discipline:', error)
    return NextResponse.json({ error: 'Failed to set discipline' }, { status: 500 })
  }
}

// GET - Get current user's discipline
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await User.findByPk(session.user.id, {
      attributes: ['discipline'],
      raw: true,
    })

    return NextResponse.json({ discipline: user?.discipline || null })
  } catch (error) {
    console.error('Error getting discipline:', error)
    return NextResponse.json({ error: 'Failed to get discipline' }, { status: 500 })
  }
}
