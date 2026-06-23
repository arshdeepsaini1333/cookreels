import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payments = await prisma.payment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { id: true, name: true } },
      },
    })

    const totalSpend = payments
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    return NextResponse.json({ payments, totalSpend })
  } catch (error) {
    console.error('[GET /api/boost/billing]', error)
    return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 })
  }
}
