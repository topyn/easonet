// Single source of truth for sandbox vs live so create.ts and capture.ts can never
// disagree about which PayPal environment an order belongs to.
export const PAYPAL_BASE_URL = process.env.PAYPAL_SANDBOX === 'true'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

export async function getPayPalToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('PayPal auth failed')
  return data.access_token
}

/** Capture a previously-approved PayPal order. Returns the capture JSON (or PayPal's error JSON). */
export async function capturePayPalOrder(paypalOrderId: string) {
  const token = await getPayPalToken()
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  return res.json()
}

/** Fetch a PayPal order — used when a capture was already done by an earlier/concurrent request. */
export async function getPayPalOrder(paypalOrderId: string) {
  const token = await getPayPalToken()
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

// True only if the order is COMPLETED and the *captured* amount + currency match what we
// charged. Never trust the browser's word (or a PayPal order id it hands us) on its own.
export function verifyPaid(data: any, expectedTotal: number, currency: string): boolean {
  if (data?.status !== 'COMPLETED') return false
  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0]
  if (capture?.status !== 'COMPLETED' || !capture?.amount?.value) return false
  return capture.amount.currency_code === currency && capture.amount.value === expectedTotal.toFixed(2)
}
