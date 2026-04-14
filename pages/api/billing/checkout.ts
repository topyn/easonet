import type { NextApiRequest, NextApiResponse } from 'next'
import { stripe, PLANS } from '../../../lib/stripe'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'
import { z } from 'zod'

const CheckoutSchema = z.object({
  plan: z.enum(['starter', 'growth', 'pro']),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Create / open customer portal for existing subscribers
  if (req.method === 'GET') {
    if (!dbUser.stripeCustomerId) return res.status(400).json({ error: 'No subscription' })
    const portal = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${baseUrl}/app`,
    })
    return res.redirect(303, portal.url)
  }

  // Create checkout session for new subscription
  if (req.method === 'POST') {
    const parsed = CheckoutSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid plan' })

    const plan = PLANS[parsed.data.plan]

    // Ensure Stripe customer exists
    let customerId = dbUser.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        metadata: { userId: dbUser.id },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${baseUrl}/app?upgraded=1`,
      cancel_url: `${baseUrl}/app?upgrade_cancelled=1`,
      subscription_data: {
        metadata: { userId: dbUser.id, plan: parsed.data.plan },
      },
    })

    return res.status(200).json({ url: session.url })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
