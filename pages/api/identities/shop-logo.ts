// pages/api/identities/shop-logo.ts — GET ?identityId=… → { logo } | { logo: '', error }
//
// "Add my shop logo" in the signature editor: the logo the seller uploaded for their
// OzStorehouse website, fetched from Oz by the identity's shop domain (only for domains whose
// mail we host, i.e. a MailDomain). Only an OzStorehouse /img/ URL is ever returned, and that's
// the only image src the inbox keeps in a signature (pages/app.tsx SHOP_LOGO_PREFIX).

import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'

const OZ_ORIGIN = process.env.OZ_ORIGIN || 'https://www.ozstorehouse.com'
const LOGO_PREFIX = 'https://www.ozstorehouse.com/img/'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  const identity = await prisma.identity.findFirst({ where: { id: String(req.query.identityId || ''), userId: dbUser.id }, select: { domain: true } })
  if (!identity) return res.status(404).json({ error: 'Address not found' })
  const domain = identity.domain.toLowerCase()
  const hosted = await prisma.mailDomain.findUnique({ where: { domain }, select: { ozAccountId: true } })
  if (!hosted?.ozAccountId) return res.json({ logo: '', error: 'Shop logos are only available for OzStorehouse shop addresses.' })

  try {
    const r = await fetch(`${OZ_ORIGIN}/api/site/shop-logo?domain=${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(6000) })
    const data = r.ok ? await r.json() : {}
    const logo = typeof data.logo === 'string' && data.logo.startsWith(LOGO_PREFIX) ? data.logo : ''
    return res.json(logo ? { logo } : { logo: '', error: 'No logo found. Add one in the Website tab of your OzStorehouse seller portal first.' })
  } catch (e: any) {
    console.error('shop-logo: Oz lookup failed', e?.message)
    return res.status(502).json({ logo: '', error: 'Couldn’t reach OzStorehouse. Please try again.' })
  }
}
