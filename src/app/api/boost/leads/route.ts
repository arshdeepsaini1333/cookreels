import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const leads = await prisma.campaignLead.findMany({
      where: { campaign: { userId: session.userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('[GET /api/boost/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
