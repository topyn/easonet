import type { NextApiRequest, NextApiResponse } from 'next'
import { addDomainToVercel, removeDomainFromVercel, domainPointsAtVercel } from '../../../lib/vercel'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'
import { assertOwnedRefs } from '../../../lib/ownership'
import { z } from 'zod'

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i

const UpdateSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  tagline: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  accentColor: z.string(),
  bgStyle: z.enum(['dark', 'light']),
  fontStyle: z.enum(['modern', 'classic']),
  customDomain: z.string().regex(DOMAIN_RE, 'Invalid domain format').optional().nullable().or(z.literal('')),
  storeId: z.string().optional().nullable(),
  waitlistId: z.string().optional().nullable(),
  identityId: z.string().optional().nullable(),
  links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  sections: z.array(z.object({ title: z.string(), content: z.string() })).default([]),
  active: z.boolean().optional(),
  template: z.string().default('1'),
  heroImage: z.string().optional().nullable(),
  headlineLine1: z.string().optional().nullable(),
  headlineLine2: z.string().optional().nullable(),
  badgeText: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  featuresHeadline: z.string().optional().nullable(),
  features: z.array(z.any()).default([]),
  stats: z.array(z.any()).default([]),
  aboutHeadline: z.string().optional().nullable(),
  contactHeadline: z.string().optional().nullable(),
  contactSub: z.string().optional().nullable(),
})

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
    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const data = parsed.data

    const refError = await assertOwnedRefs(dbUser.id, data)
    if (refError) return res.status(403).json({ error: refError })

    const oldDomain = page.customDomain
    const newDomain = data.customDomain || null

    // Require the domain to already point at Vercel before we ever claim it via the API -
    // otherwise any signed-up user could squat an arbitrary domain they don't control.
    if (newDomain && newDomain !== oldDomain) {
      const pointsAtVercel = await domainPointsAtVercel(newDomain)
      if (!pointsAtVercel) {
        return res.status(400).json({ error: 'Point this domain at Vercel first (A record to 76.76.21.21, or a CNAME to cname.vercel-dns.com), then try again.' })
      }
    }

    if (newDomain && newDomain !== oldDomain) {
      const existingDomain = await prisma.brandPage.findFirst({ where: { customDomain: newDomain, id: { not: page.id } } })
      if (existingDomain) return res.status(400).json({ error: 'That domain is already in use by another page' })
    }

    const existingSlug = data.slug !== page.slug
      ? await prisma.brandPage.findFirst({ where: { slug: data.slug, id: { not: page.id } } })
      : null
    if (existingSlug) return res.status(400).json({ error: 'That slug is already taken' })

    const updated = await prisma.brandPage.update({
      where: { id: page.id },
      data: {
        slug: data.slug, title: data.title, tagline: data.tagline, description: data.description,
        logoUrl: data.logoUrl || null,
        accentColor: data.accentColor, bgStyle: data.bgStyle, fontStyle: data.fontStyle,
        customDomain: newDomain,
        storeId: data.storeId || null,
        waitlistId: data.waitlistId || null,
        identityId: data.identityId || null,
        links: data.links,
        sections: data.sections,
        active: data.active,
        template: data.template || '1',
        heroImage: data.heroImage || null,
        headlineLine1: data.headlineLine1 || null,
        headlineLine2: data.headlineLine2 || null,
        badgeText: data.badgeText || null,
        ctaText: data.ctaText || null,
        featuresHeadline: data.featuresHeadline || null,
        features: data.features,
        stats: data.stats,
        aboutHeadline: data.aboutHeadline || null,
        contactHeadline: data.contactHeadline || null,
        contactSub: data.contactSub || null,
      },
    })

    if (newDomain && newDomain !== oldDomain) {
      const result = await addDomainToVercel(newDomain)
      if (!result.success) console.warn('Could not auto-register domain with Vercel:', result.error)
    }
    if (oldDomain && oldDomain !== newDomain) {
      await removeDomainFromVercel(oldDomain)
    }

    return res.json({ ...updated, vercelDomainAdded: !!newDomain })
  }

  if (req.method === 'DELETE') {
    await prisma.brandPage.delete({ where: { id: page.id } })
    return res.json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  res.status(405).end()
}
