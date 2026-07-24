import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getPayPalToken, PAYPAL_BASE_URL } from '../../../lib/paypal'
import { rateLimit, clientIp } from '../../../lib/rateLimit'
import { z } from 'zod'

const CreateSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerAddress: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).end()

  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!rateLimit(`orders-create:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests — please wait a few minutes and try again' })
  }

  const parsed = CreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { productId, quantity, buyerName, buyerEmail, buyerAddress } = parsed.data

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { store: true },
  })
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const total = (product.price * quantity).toFixed(2)

  try {
    const token = await getPayPalToken()
    const ppRes = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: product.currency, value: total },
          description: `${product.name} x${quantity} — ${product.store.name}`,
        }],
      }),
    })
    const ppData = await ppRes.json()

    const order = await prisma.order.create({
      data: {
        storeId: product.storeId,
        productId,
        buyerEmail,
        buyerName,
        buyerAddress,
        quantity,
        total: parseFloat(total),
        currency: product.currency,
        paypalOrderId: ppData.id,
        status: 'pending',
      },
    })

    return res.status(201).json({ orderId: order.id, paypalOrderId: ppData.id })
  } catch (err: any) {
    console.error('CREATE ORDER ERROR:', err.message)
    return res.status(500).json({ error: 'Failed to create order' })
  }
}
