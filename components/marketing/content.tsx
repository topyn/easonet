import Link from 'next/link'
import { PRICE } from './MarketingLayout'

// Copy shared between the marketing pages. Only promise what is live on the shop engine
// or in the launch spec (docs/specs/easonet-webshop-service-spec-2026-10-31.md in the
// ozstorehouse repo) - no trial, GST wording, transaction-fee claims or email forwarding
// until Mark decides/builds them.

export const FAQ: { q: string; a: string }[] = [
  { q: `What do I get for ${PRICE} a month?`,
    a: 'Everything: your website on your own domain, your shop and product pages, enquiries and commission requests, the Website tab to set the look and content, the domain checker, visit stats, and membership of the shop-owner community. There is one plan and nothing is locked behind a higher tier.' },
  { q: 'Do I need my own domain?',
    a: "Yes - your shop lives on your own address, like yourshop.com.au. If you already own one, keep it where it is; we show you the two records to add and check them for you. If you don't have one yet, you can buy one from any domain registrar. The domain stays yours." },
  { q: 'How do my customers pay?',
    a: 'Straight to you. Customers pay through your own PayPal, or contact you to buy and you arrange payment the way you already do. We never hold your customers’ money.' },
  { q: 'Do I need any technical skills?',
    a: "No. You pick a look, add your logo and listings, and check how it looks on a phone and a computer before anything goes live. If you get stuck, the community and the how-to guides are there, and we help with setup." },
  { q: 'What is the community?',
    a: 'A shared forum and library of how-tos for everyone who runs a shop on our platform - easonet shop owners and the makers on OzStorehouse. Ask questions, share what works and learn from people doing the same thing you are.' },
  { q: 'Is there a contract?',
    a: `No lock-in. It's ${PRICE} a month and you can cancel any time.` },
  { q: 'When can I start?',
    a: "Soon. We're opening to a small group of shops first so we can set each one up properly. Register your interest and we'll contact you personally." },
  { q: 'I already use the easonet inbox or brand pages. What changes?',
    a: 'Nothing you need to do. Your inbox, pages and stores keep working - just sign in as usual.' },
]

export function FaqList({ items = FAQ }: { items?: { q: string; a: string }[] }) {
  return (
    <div className="mk-faq">
      {items.map(f => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  )
}

export const INCLUDED = [
  'Your website on your own domain',
  'Home, Shop, About, Contact, FAQ and Shipping & returns pages',
  'Product pages with photos, variants and collections',
  'Four looks to choose from, your logo and an announcement bar',
  'Live preview on phone and computer before you publish',
  'Self-serve domain connection with a live checker',
  'Enquiries, offers and commission requests',
  'Payments straight to you',
  'Visit stats for your site',
  'The shop-owner community: forum and how-tos',
]

export function PriceCard({ cta = true }: { cta?: boolean }) {
  return (
    <div className="mk-price-card">
      <div className="mk-eyebrow" style={{ marginBottom: 10 }}>One plan · everything included</div>
      <div className="mk-price">{PRICE}<small> / month</small></div>
      <p className="mk-price-note">One plan, no tiers. Cancel any time.</p>
      <ul className="mk-ticks">{INCLUDED.map(i => <li key={i}>{i}</li>)}</ul>
      {cta && <Link href="/register" className="mk-btn mk-btn-lg" style={{ width: '100%', marginTop: 28 }}>Register interest →</Link>}
    </div>
  )
}

export function LiveExample() {
  return (
    <div className="mk-example">
      <div className="mk-browser">
        <div className="mk-browser-bar" aria-hidden="true"><i /><i /><i /><span>inked.ozstorehouse.com</span></div>
        <img src="/showcase/example-desktop.jpg" width={1440} height={900} alt="The home page of a real shop running on the easonet shop engine, on a computer" />
      </div>
      <div className="mk-phone">
        <img src="/showcase/example-phone.jpg" width={780} height={1688} alt="The same shop on a phone" />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .mk-example { position: relative; padding-right: 9%; }
        .mk-browser { background: #fff; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; box-shadow: 0 24px 60px -24px rgba(34,29,23,.35); }
        .mk-browser-bar { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--line); background: #F7F2EA; }
        .mk-browser-bar i { width: 10px; height: 10px; border-radius: 50%; background: #E1D5C4; }
        .mk-browser-bar span { margin-left: 10px; font-size: 12px; color: var(--muted); background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 2px 10px; }
        .mk-browser img { width: 100%; height: auto; }
        .mk-phone { position: absolute; right: 0; bottom: -28px; width: 24%; border: 6px solid #221D17; border-radius: 26px; overflow: hidden; background: #221D17; box-shadow: 0 24px 50px -18px rgba(34,29,23,.5); aspect-ratio: 390 / 760; }
        .mk-phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 20px; }
      ` }} />
    </div>
  )
}
