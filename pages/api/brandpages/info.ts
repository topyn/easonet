import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { accountActive } from '../../../lib/plan'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { slug, domain } = req.query

  const owner = { user: { select: { plan: true, trialEndsAt: true } } }
  let found = null
  if (slug) {
    found = await prisma.brandPage.findUnique({ where: { slug: String(slug) }, include: owner })
  } else if (domain) {
    found = await prisma.brandPage.findFirst({ where: { customDomain: String(domain) }, include: owner })
  }

  if (!found || !found.active) return res.status(404).json({ error: 'Not found' })
  const { user, ...page } = found
  if (!accountActive(user)) return res.status(404).json({ error: 'This site is paused' })

  // Fetch linked store products
  let storeData = null
  if (page.storeId) {
    storeData = await prisma.store.findFirst({
      where: { id: page.storeId, active: true },
      select: {
        id: true, name: true, slug: true,
        products: { where: { active: true }, select: { id: true, name: true, description: true, price: true, currency: true, type: true, imageUrl: true } },
      },
    })
  }

  // Fetch linked waitlist count
  let waitlistData = null
  if (page.waitlistId) {
    waitlistData = await prisma.waitlist.findUnique({
      where: { id: page.waitlistId },
      select: { id: true, name: true, slug: true, headline: true, buttonText: true, _count: { select: { signups: true } } },
    })
  }

  return res.json({ ...page, storeData, waitlistData })
}
