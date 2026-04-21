import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { sendFromIdentity } from '../../../lib/mailer'
import { z } from 'zod'

const CaptureSchema = z.object({
  orderId: z.string(),
  paypalOrderId: z.string(),
})

async function getPayPalToken() {
  const baseUrl = process.env.PAYPAL_SANDBOX === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  const parsed = CaptureSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { orderId, paypalOrderId } = parsed.data

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      store: { include: { identity: true } },
    },
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  try {
    const baseUrl = process.env.PAYPAL_SANDBOX === 'true'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'
    const token = await getPayPalToken()
    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    const captureData = await captureRes.json()

    if (captureData.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Payment not completed' })
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'paid' },
    })

    if (order.store.identity) {
      const deliveryText = order.product.type === 'digital'
        ? `\n\nYour download:\n${order.product.fileUrl || order.product.deliveryNote || 'We will send your download link shortly.'}`
        : `\n\nWe will ship your order shortly.`

      await sendFromIdentity({
        identity: order.store.identity,
        to: order.buyerEmail,
        subject: `Order confirmed — ${order.product.name}`,
        text: `Hi ${order.buyerName},\n\nThank you for your order!\n\n${order.product.name} x${order.quantity} — $${order.total} ${order.currency}${deliveryText}\n\nThank you,\n${order.store.name}`,
      })

      await sendFromIdentity({
        identity: order.store.identity,
        to: order.store.identity.email,
        subject: `New order: ${order.product.name}`,
        text: `New order received!\n\nProduct: ${order.product.name}\nQty: ${order.quantity}\nTotal: $${order.total}\n\nBuyer: ${order.buyerName} (${order.buyerEmail})${order.buyerAddress ? `\nAddress: ${order.buyerAddress}` : ''}`,
      })
    }

    return res.json({
      ok: true,
      product: {
        name: order.product.name,
        type: order.product.type,
        fileUrl: order.product.fileUrl,
        deliveryNote: order.product.deliveryNote,
      },
    })
  } catch (err: any) {
    console.error('CAPTURE ERROR:', err.message)
    return res.status(500).json({ error: 'Failed to capture payment' })
  }
}
