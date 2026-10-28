import { PLANS, TRIAL_DOMAIN_LIMIT } from './stripe'

interface PlanUser { plan: string; trialEndsAt: Date | null }

// A paid plan, or a trial that hasn't run out. When this is false the account's public
// sites and checkout are paused - a lapsed trial must not keep a live shop forever.
export function accountActive(user: PlanUser): boolean {
  if (user.plan !== 'trial') return true
  return !user.trialEndsAt || new Date() <= user.trialEndsAt
}

export function domainLimit(user: PlanUser): number {
  if (user.plan === 'trial') return TRIAL_DOMAIN_LIMIT
  return PLANS[user.plan as keyof typeof PLANS]?.domains ?? TRIAL_DOMAIN_LIMIT
}
