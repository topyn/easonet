import type { Identity } from '@prisma/client'
import { prisma } from '../prisma'

// Which identity receives mail for an envelope recipient on a seller domain we host.
// Same rules as the MX servers' RCPT check (mx/src/addresses.mjs), applied here against the
// database so a stale MX list can never deliver to the wrong place:
//   1. exact address (active, or retiring and still inside its 30-day grace)
//   2. same address without a "+tag" (hello+orders@ → hello@)
//   3. postmaster@ / abuse@, or anything when the domain has catch-all on → first active address
// Anything else is rejected.

export const SYSTEM_LOCAL_PARTS = ['postmaster', 'abuse']

// Local part rules for seller-chosen addresses: letters, digits, . - _ ; 1–64 chars; no
// leading/trailing/double dots. "+" is reserved for tags.
const LOCAL_PART_RE = /^(?!.*\.\.)[a-z0-9_-](?:[a-z0-9._-]{0,62}[a-z0-9_-])?$/

export function isValidLocalPart(local: string): boolean {
  return LOCAL_PART_RE.test(local) && !SYSTEM_LOCAL_PARTS.includes(local)
}

export function splitAddress(address: string): { local: string; domain: string } | null {
  const at = address.lastIndexOf('@')
  if (at < 1 || at === address.length - 1) return null
  return { local: address.slice(0, at).toLowerCase(), domain: address.slice(at + 1).toLowerCase().replace(/\.$/, '') }
}

function canReceive(identity: Identity, now: Date): boolean {
  if (identity.status === 'active') return true
  if (identity.status === 'retiring') return !!identity.retiresAt && identity.retiresAt > now
  return false
}

export async function resolveRecipient(address: string): Promise<Identity | null> {
  const parts = splitAddress(address)
  if (!parts) return null
  const mailDomain = await prisma.mailDomain.findUnique({ where: { domain: parts.domain } })
  if (!mailDomain || !mailDomain.inboundEnabled) return null

  const now = new Date()
  const identities = (await prisma.identity.findMany({
    where: { domain: parts.domain, userId: mailDomain.userId },
    orderBy: { createdAt: 'asc' },
  })).filter(i => canReceive(i, now))

  const byLocal = (local: string) => identities.find(i => i.email.toLowerCase() === `${local}@${parts.domain}`)
  const base = parts.local.split('+')[0]
  const firstActive = identities.find(i => i.status === 'active') ?? null

  return byLocal(parts.local)
    ?? byLocal(base)
    ?? (SYSTEM_LOCAL_PARTS.includes(base) || mailDomain.catchAll ? firstActive : null)
}
