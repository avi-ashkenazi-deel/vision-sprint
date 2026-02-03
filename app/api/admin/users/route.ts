import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { User } from '@/models'

// GET all users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'image', 'isAdmin', 'discipline'],
      order: [['name', 'ASC']],
    })

    return NextResponse.json(users.map((u) => u.toJSON()))
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
