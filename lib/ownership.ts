import { prisma } from './prisma'

// Foreign keys the client is trusted to *name* (identityId/storeId/waitlistId) but not
// to own by assertion alone — always re-check against the DB before attaching them to
// a record, or a user can point their own row at someone else's identity/store/waitlist.
export async function assertOwnedRefs(
  userId: string,
  refs: { identityId?: string | null; storeId?: string | null; waitlistId?: string | null }
): Promise<string | null> {
  if (refs.identityId) {
    const owned = await prisma.identity.findFirst({ where: { id: refs.identityId, userId } })
    if (!owned) return 'Invalid identity'
  }
  if (refs.storeId) {
    const owned = await prisma.store.findFirst({ where: { id: refs.storeId, userId } })
    if (!owned) return 'Invalid store'
  }
  if (refs.waitlistId) {
    const owned = await prisma.waitlist.findFirst({ where: { id: refs.waitlistId, userId } })
    if (!owned) return 'Invalid waitlist'
  }
  return null
}
