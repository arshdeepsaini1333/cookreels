// ─── Razorpay global type ─────────────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: (r: Record<string, string>) => void): void }
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window.Razorpay !== 'undefined') { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

interface PayForCampaignCallbacks {
  onSuccess?: (campaignId: string) => void
  onError?:   (message: string) => void
  onDismiss?: () => void
}

// Kicks off the Razorpay checkout for an existing DRAFT / PENDING_PAYMENT campaign —
// creates the order, opens checkout, then verifies the payment server-side.
export async function payForCampaign(campaignId: string, callbacks: PayForCampaignCallbacks = {}): Promise<void> {
  const { onSuccess, onError, onDismiss } = callbacks

  try {
    const loaded = await loadRazorpayScript()
    if (!loaded) { onError?.('Could not load payment gateway. Check your internet connection.'); return }

    const orderRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId }),
    })
    const orderData = await orderRes.json() as { orderId?: string; amount?: number; paymentId?: string; keyId?: string; campaignName?: string; error?: string }
    if (!orderRes.ok) { onError?.(orderData.error ?? 'Failed to create payment order'); return }

    const { orderId, amount, paymentId, keyId, campaignName } = orderData as Required<typeof orderData>

    const rzp = new window.Razorpay({
      key:          keyId,
      amount,
      currency:     'INR',
      name:         'CookReels',
      description:  `Campaign: ${campaignName}`,
      order_id:     orderId,
      theme:        { color: '#F5C518' },
      modal:        { ondismiss: () => onDismiss?.() },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentId,
            }),
          })
          const verifyData = await verifyRes.json() as { success?: boolean; campaignId?: string; error?: string }
          if (!verifyRes.ok) { onError?.(verifyData.error ?? 'Payment verification failed'); return }
          onSuccess?.(verifyData.campaignId ?? campaignId)
        } catch {
          onError?.('Payment verification failed. Contact support.')
        }
      },
    })
    rzp.on('payment.failed', () => onError?.('Payment failed. Please try again.'))
    rzp.open()
  } catch {
    onError?.('Something went wrong. Please try again.')
  }
}
