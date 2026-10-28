import { prisma } from './prisma'
import { domainPointsAtVercel } from './vercel'
import { accountActive, domainLimit } from './plan'

interface DomainOwner { id: string; plan: string; trialEndsAt: Date | null }

// Every check a brand page must pass before it may claim a custom domain. Returns an error
// message, or null when the domain can be claimed. Shared by create and update so neither
// path can skip the DNS (anti-squat) or plan-limit checks.
export async function customDomainError(user: DomainOwner, domain: string, pageId?: string): Promise<string | null> {
  if (!accountActive(user)) return 'Your trial has ended - upgrade to connect a custom domain.'

  const inUse = await prisma.brandPage.findFirst({ where: { customDomain: domain, ...(pageId && { id: { not: pageId } }) } })
  if (inUse) return 'That domain is already in use by another page'

  const ownDomains = await prisma.brandPage.count({
    where: { userId: user.id, customDomain: { not: null }, ...(pageId && { id: { not: pageId } }) },
  })
  if (ownDomains >= domainLimit(user)) return 'Your plan\'s custom domain limit is reached - upgrade to add another.'

  if (!(await domainPointsAtVercel(domain))) {
    return 'Point this domain at Vercel first (A record to 76.76.21.21, or a CNAME to cname.vercel-dns.com), then try again.'
  }
  return null
}
