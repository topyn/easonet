import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 999,          // cents
    domains: 5,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
  },
  growth: {
    name: 'Growth',
    price: 1999,
    domains: 20,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
  },
  pro: {
    name: 'Pro',
    price: 3499,
    domains: 999,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
}

export const TRIAL_DAYS = 30
export const TRIAL_DOMAIN_LIMIT = 3
