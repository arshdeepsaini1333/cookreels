import Razorpay from 'razorpay'
import { createHmac, timingSafeEqual } from 'crypto'

let _instance: Razorpay | null = null

function getRazorpay(): Razorpay {
  if (!_instance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set')
    }
    _instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return _instance
}

export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  notes?: Record<string, string>,
) {
  const rzp = getRazorpay()
  return rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: receipt.slice(0, 40),
    notes,
  })
}

export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET not set')

  const body = `${razorpayOrderId}|${razorpayPaymentId}`
  const expected = createHmac('sha256', secret).update(body).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(razorpaySignature, 'hex'))
  } catch {
    return false
  }
}
