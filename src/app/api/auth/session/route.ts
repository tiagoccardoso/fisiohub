import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-server'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url ?? null,
      phone: user.phone ?? null,
      crefito: user.crefito ?? null,
      specialty: user.specialty ?? null,
      university: user.university ?? null,
      semester: user.semester ?? null,
    },
  })
}
