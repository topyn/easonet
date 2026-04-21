import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

const CreateSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerAddress: z.string().optional(),
})

async function getPayPalToken() {
  const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
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
    const ppRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
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
