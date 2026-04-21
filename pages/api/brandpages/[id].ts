import type { NextApiRequest, NextApiResponse } from 'next'
import { addDomainToVercel, removeDomainFromVercel } from '../../../lib/vercel'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  const { id } = req.query
  const page = await prisma.brandPage.findFirst({
    where: { id: String(id), userId: dbUser.id },
    include: {
      identity: { select: { name: true, color: true, email: true } },
      store: { select: { id: true, name: true, slug: true } },
      waitlist: { select: { id: true, name: true, slug: true } },
    },
  })
  if (!page) return res.status(404).json({ error: 'Not found' })

  if (req.method === 'GET') return res.json(page)

  if (req.method === 'PUT') {
    const { slug, title, tagline, description, logoUrl, accentColor, bgStyle, fontStyle, customDomain, storeId, waitlistId, identityId, links, sections, active } = req.body
    const updated = await prisma.brandPage.update({
      where: { id: String(id) },
      data: {
        slug, title, tagline, description,
        logoUrl: logoUrl || null,
        accentColor, bgStyle, fontStyle,
        customDomain: customDomain || null,
        storeId: storeId || null,
        waitlistId: waitlistId || null,
        identityId: identityId || null,
        links: links || [],
        sections: sections || [],
        active,
      },
    })

    // Auto-register new custom domain with Vercel
    const oldDomain = page.customDomain
    const newDomain = customDomain || null
    if (newDomain && newDomain !== oldDomain) {
      const result = await addDomainToVercel(newDomain)
      if (!result.success) console.warn('Could not auto-register domain with Vercel:', result.error)
    }
    // Remove old domain from Vercel if changed
    if (oldDomain && oldDomain !== newDomain) {
      await removeDomainFromVercel(oldDomain)
    }

    return res.json({ ...updated, vercelDomainAdded: !!newDomain })
  }

  if (req.method === 'DELETE') {
    await prisma.brandPage.delete({ where: { id: String(id) } })
    return res.json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  res.status(405).end()
}
