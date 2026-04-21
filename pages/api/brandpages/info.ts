import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { slug, domain } = req.query

  let page = null
  if (slug) {
    page = await prisma.brandPage.findUnique({ where: { slug: String(slug) } })
  } else if (domain) {
    page = await prisma.brandPage.findFirst({ where: { customDomain: String(domain) } })
  }

  if (!page) return res.status(404).json({ error: 'Not found' })

  // Fetch linked store products
  let storeData = null
  if (page.storeId) {
    storeData = await prisma.store.findUnique({
      where: { id: page.storeId },
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
