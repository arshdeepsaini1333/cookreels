import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature } from '@/lib/razorpay'

const VerifySchema = z.object({
  razorpayOrderId:   z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  paymentId:         z.string().min(1),
})

// ─── POST /api/payments/verify ────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = VerifySchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = result.data

  // Verify signature server-side — never trust client-reported status
  const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  // Fetch our Payment record and verify ownership
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId: session.userId },
    select: {
      id:             true,
      razorpayOrderId:true,
      campaignId:     true,
      status:         true,
      amount:         true,
    },
  })

  if (!payment) return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })

  if (payment.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
  }

  if (payment.status === 'SUCCESS') {
    return NextResponse.json({ success: true, campaignId: payment.campaignId })
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Mark payment as successful
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status:          'SUCCESS',
          paymentMethod:   'razorpay',
          gatewayResponse: {
            orderId:   razorpayOrderId,
            paymentId: razorpayPaymentId,
          },
        },
      })

      if (payment.campaignId) {
        const now = new Date()

        // Activate campaign and link payment
        const campaign = await tx.campaign.update({
          where: { id: payment.campaignId },
          data: {
            status:    'ACTIVE',
            paymentId: paymentId,
            startDate: now,
          },
          select: { durationDays: true, startDate: true },
        })

        // Set endDate based on durationDays
        const endDate = new Date(now)
        endDate.setDate(endDate.getDate() + campaign.durationDays)

        await tx.campaign.update({
          where: { id: payment.campaignId },
          data:  { endDate },
        })

        // Seed initial analytics row
        await tx.campaignAnalytics.upsert({
          where:  { campaignId: payment.campaignId },
          create: { campaignId: payment.campaignId },
          update: {},
        })
      }
    })

    return NextResponse.json({ success: true, campaignId: payment.campaignId })
  } catch (error) {
    console.error('[POST /api/payments/verify]', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
