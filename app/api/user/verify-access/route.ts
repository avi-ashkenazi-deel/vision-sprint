import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { User } from '@/models'

// The access password - in production, use an environment variable
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'lets-deel-think-far-away'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // Check if password matches
    if (password !== ACCESS_PASSWORD) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })
    }

    // Update user's accessVerified status
    await User.update(
      { accessVerified: true },
      { where: { id: session.user.id } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying access:', error)
    return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 })
  }
}
