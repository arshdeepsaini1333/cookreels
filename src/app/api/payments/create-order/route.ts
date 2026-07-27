import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createRazorpayOrder } from '@/lib/razorpay'

const CreateOrderSchema = z.object({
  campaignId: z.string().min(1),
})

// ─── POST /api/payments/create-order ─────────────────────────────────────────

export async function POST(req: Request) {
  // Guard env vars immediately — before any DB or Razorpay work
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('[create-order] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment')
    return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = CreateOrderSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const { campaignId } = result.data

  // Fetch campaign and verify ownership
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: session.userId },
    select: { id: true, name: true, status: true, totalBudget: true },
  })

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (!['DRAFT', 'PENDING_PAYMENT'].includes(campaign.status)) {
    return NextResponse.json(
      { error: 'Campaign is not in a payable state' },
      { status: 409 },
    )
  }

  // Amount in paise (1 INR = 100 paise), minimum 100 paise (₹1)
  const amountPaise = Math.max(100, Math.round(Number(campaign.totalBudget) * 100))

  try {
    // Create Razorpay order
    const order = await createRazorpayOrder(amountPaise, campaign.id, {
      campaignId: campaign.id,
      campaignName: campaign.name.slice(0, 40),
    })

    // Create Payment record
    const payment = await prisma.payment.create({
      data: {
        userId:         session.userId,
        campaignId:     campaign.id,
        razorpayOrderId:order.id,
        amount:         campaign.totalBudget,
        currency:       'INR',
        status:         'CREATED',
      },
      select: { id: true },
    })

    // Transition campaign to PENDING_PAYMENT
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'PENDING_PAYMENT' },
    })

    return NextResponse.json({
      orderId:      order.id,
      amount:       amountPaise,
      currency:     'INR',
      paymentId:    payment.id,
      keyId:        process.env.RAZORPAY_KEY_ID,
      campaignName: campaign.name,
    })
  } catch (error) {
    // The Razorpay SDK throws plain objects like { statusCode, error: { code, description } }
    // rather than Error instances, so pull the description out before falling back to JSON.
    const rzpError = error as { error?: { description?: string; code?: string } } | null
    const msg = error instanceof Error
      ? error.message
      : rzpError?.error?.description ?? JSON.stringify(error)
    console.error('[POST /api/payments/create-order]', msg, error)
    return NextResponse.json({ error: 'Failed to create payment order', detail: msg }, { status: 500 })
  }
}
