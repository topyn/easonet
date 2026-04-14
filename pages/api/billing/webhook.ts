import type { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '../../../lib/stripe'
import { prisma } from '../../../lib/prisma'
import Stripe from 'stripe'

export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const getPlanFromPriceId = (priceId: string) => {
    if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
    if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) return 'growth'
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
    return 'starter'
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id
      const plan = getPlanFromPriceId(priceId)
      const customerId = sub.customer as string

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubId: sub.id,
          plan: sub.status === 'active' ? plan : 'trial',
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await prisma.user.updateMany({
        where: { stripeCustomerId: sub.customer as string },
        data: { plan: 'trial', stripeSubId: null },
      })
      break
    }
  }

  return res.status(200).json({ received: true })
}
