// pages/api/auth/oz-handoff.ts — sign in a seller arriving from the OzStorehouse portal's
// "✉️ Email" button (ozstorehouse lib/emailHandoff.ts), and set up their inbox on first visit.
//
//   POST { code } → { access_token, refresh_token, user } (same shape as /api/auth/login)
//
// The one-time code is redeemed with OzStorehouse server to server; Oz says who the seller is,
// which domain they have and which mailboxes admin switched on. We then make sure they have an
// easonet user, their MailDomain (inbound on, linked to their Oz account) and one Identity per
// mailbox, and sign them in without a password (Supabase magic-link token, verified here).

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../../../lib/prisma'
import { brevoSmtpConfig } from '../../../lib/mailer'
import { rateLimit, clientIp } from '../../../lib/rateLimit'

const OZ_ORIGIN = process.env.OZ_ORIGIN || 'https://www.ozstorehouse.com'

type Seller = { ozAccountId: string; email: string; name: string; storeName: string; domain: string; addresses: string[]; brand: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!rateLimit(`oz-handoff:${clientIp(req)}`, 10, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many attempts — please wait a few minutes' })

  const code = String(req.body?.code || '')
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(code)) return res.status(400).json({ error: 'That link is incomplete — open Email from your portal again' })

  const r = await fetch(`${OZ_ORIGIN}/api/email-handoff/redeem`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!r || r.status === 404) return res.status(401).json({ error: 'That link has expired or was already used — open Email from your portal again' })
  if (!r.ok) return res.status(502).json({ error: 'Couldn’t reach OzStorehouse — please try again' })
  const seller: Seller = (await r.json()).seller
  const domain = String(seller?.domain || '').toLowerCase()
  const email = String(seller?.email || '').toLowerCase()
  if (!domain || !email || !seller.addresses?.length) return res.status(403).json({ error: 'Email isn’t switched on for your shop yet' })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  // The domain must be free, or already this seller's.
  const existing = await prisma.mailDomain.findUnique({ where: { domain } })
  if (existing && existing.ozAccountId && existing.ozAccountId !== seller.ozAccountId) {
    console.error('oz-handoff: domain belongs to another Oz account', domain)
    return res.status(409).json({ error: 'This domain’s email is set up under another account — contact easonet support' })
  }

  // Auth user (no password: they come in from the portal) + easonet user row.
  await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => null) // fine if they already exist
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (link.error || !link.data?.user || !link.data.properties?.hashed_token) {
    console.error('oz-handoff: generateLink failed', link.error?.message)
    return res.status(500).json({ error: 'Couldn’t sign you in — please try again' })
  }
  const authUser = link.data.user
  const user = (await prisma.user.findUnique({ where: { email } }))
    || await prisma.user.create({ data: { supabaseId: authUser.id, email, plan: 'pro' } })

  // Their domain and mailboxes.
  if (existing) {
    if (existing.userId !== user.id || !existing.ozAccountId || !existing.inboundEnabled) {
      await prisma.mailDomain.update({ where: { domain }, data: { userId: user.id, ozAccountId: seller.ozAccountId, inboundEnabled: true } })
    }
  } else {
    await prisma.mailDomain.create({ data: { domain, userId: user.id, ozAccountId: seller.ozAccountId, inboundEnabled: true, dnsMode: 'manual' } })
  }
  for (const box of seller.addresses) {
    const address = `${box}@${domain}`
    const id = await prisma.identity.findUnique({ where: { email: address } })
    if (!id) {
      await prisma.identity.create({ data: { userId: user.id, name: seller.storeName || box, email: address, domain, status: 'active', ...brevoSmtpConfig() } })
    } else if (id.userId !== user.id || id.status !== 'active') {
      await prisma.identity.update({ where: { email: address }, data: { userId: user.id, status: 'active', retiresAt: null } })
    }
  }

  // Exchange the magic-link token for a session, here on the server (nothing is emailed).
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' })
  if (error || !data.session) {
    console.error('oz-handoff: verifyOtp failed', error?.message)
    return res.status(500).json({ error: 'Couldn’t sign you in — please try again' })
  }

  return res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: user.id, email: user.email, plan: user.plan, trialEndsAt: user.trialEndsAt },
  })
}
