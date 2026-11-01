import Link from 'next/link'
import { PRICE } from './MarketingLayout'

// Copy shared between the marketing pages. Only promise what is live on the shop engine
// or in the launch spec (docs/specs/easonet-webshop-service-spec-2026-10-31.md in the
// ozstorehouse repo) - no trial, GST wording, transaction-fee claims or email forwarding
// until Mark decides/builds them.

// Feature list for /features — also feeds the Markdown version and llms.txt (lib/agent.ts).
export const FEATURE_GROUPS: { title: string; intro: string; items: { name: string; text: string; soon?: boolean }[] }[] = [
  {
    title: 'Your website',
    intro: 'A complete small-business website, built from the details you fill in once.',
    items: [
      { name: 'All the pages a shop needs', text: 'Home, Shop, About, Contact, FAQ and Shipping & returns, plus terms and privacy pages for your buyers.' },
      { name: 'Four looks', text: 'Pick a look, add your logo and colours. Change your mind any time without losing anything.' },
      { name: 'Blog', text: 'Write news, how-tos and behind-the-scenes posts on your own site. Each post gets its own page, share card and spot in your sitemap, which helps Google find you.' },
      { name: 'Find us at', text: 'List the markets, stalls, pop-ups and exhibitions you’ll be at, so local customers can come and see you.' },
      { name: 'Your social posts', text: 'Show your latest Facebook and Instagram posts on your home page.' },
      { name: 'Announcement bar', text: 'Tell visitors about Christmas cut-offs, a sale or a new range across the top of every page.' },
      { name: 'Live preview', text: 'See your site on a phone and a computer as you edit, before anything goes live.' },
      { name: 'Search-ready', text: 'Set the titles and descriptions Google shows for your pages. Every page has a sitemap entry and a proper share card.' },
      { name: 'Fast and mobile-first', text: 'Pages load quickly and are built for phones first, which is where most of your customers will be.' },
    ],
  },
  {
    title: 'Selling',
    intro: 'Everything between a customer finding your product and you getting paid.',
    items: [
      { name: 'Product pages', text: 'Photos, prices, variants such as size or colour, and collections to group your range.' },
      { name: 'Enquiries and offers', text: 'Customers can ask a question or make an offer, and you reply from one place.' },
      { name: 'Commission requests', text: 'If you make to order, customers can send you a custom request with all the details you need.' },
      { name: 'Payments straight to you', text: 'Customers pay through your own PayPal, or contact you to buy. We never hold your customers’ money.' },
      { name: 'Cart and card checkout', text: 'Customers add several items to a cart and pay by card through your own Square account. The money goes straight to you, with no per-sale fee from us.', soon: true },
      { name: 'Bring your shop across', text: 'Already selling on GoDaddy or Shopify? Import your products and photos in a few clicks, so you don’t start from scratch.' },
      { name: 'Share cards', text: 'Every product shares nicely on Facebook and messaging apps, with its photo and price.' },
    ],
  },
  {
    title: 'Your domain',
    intro: 'Your shop lives on the address you own, not on someone else’s.',
    items: [
      { name: 'Connect it yourself', text: 'Type in your domain and we show you exactly which two records to add, wherever you bought it.' },
      { name: 'Live checker', text: 'Each step turns green as it starts working, so you know when your site is ready.' },
      { name: 'Secure by default', text: 'Your site is served over https automatically. No certificates to buy or renew.' },
      { name: 'Preview before go-live', text: 'Check your site privately before you point your domain at it.' },
    ],
  },
  {
    title: 'Email on your domain',
    intro: 'Look like a real business: email at the address on your website.',
    items: [
      { name: 'Up to three addresses', text: 'Choose addresses like sales@ or orders@ on your own domain. We set up everything behind the scenes.' },
      { name: 'One simple inbox', text: 'All your shop’s email in one place that works on your phone and your computer.' },
      { name: 'Copy to your personal email', text: 'Optionally get a copy of every email in Gmail, Outlook or your phone’s mail app, so you never miss a customer.' },
      { name: 'Scam warnings', text: 'Emails that fail the sender’s own security checks are clearly flagged, so fake invoices and payment requests stand out.' },
      { name: 'Reply from your own address', text: 'Send and reply as sales@yourshop.com.au, straight from the inbox.', soon: true },
    ],
  },
  {
    title: 'Insights',
    intro: 'Know what is working.',
    items: [
      { name: 'Visit stats', text: 'See how many people visit your site and which pages they look at.' },
      { name: 'Enquiries in one place', text: 'Every question, offer and commission request together, so nothing gets lost.' },
      { name: 'Benchmarks', text: 'See how your site compares with similar shops on the platform, anonymously.', soon: true },
    ],
  },
  {
    title: 'Community',
    intro: 'The part most shop builders leave out.',
    items: [
      { name: 'Shop-owner forum', text: 'A shared forum with other easonet owners and OzStorehouse makers. Ask, answer, share what works.' },
      { name: 'How-to library', text: 'Practical guides on photos, pricing, product descriptions and getting found.' },
      { name: 'Getting-started checklist', text: 'A short list that walks you through your first weeks, step by step.' },
    ],
  },
]

// The three setup steps on the home page (also in its Markdown version).
export const STEPS = [
  { n: '1', title: 'Pick a look', text: 'Choose one of four looks, add your logo, colours and a short story about you. Add your products with photos and prices.' },
  { n: '2', title: 'Connect your domain', text: 'Add two records where you bought your domain. The live checker shows each step turning green.' },
  { n: '3', title: 'Go live', text: 'Preview on phone and computer, then switch it on. Your shop is open on your own address.' },
]

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

// Central Coast businesses can start free on OzStorehouse and grow into a full website there.
const OZ_SELLER_URL = 'https://www.ozstorehouse.com/become-a-seller?utm_source=easonet&utm_medium=referral&utm_campaign=cc_free_website'

export function CentralCoastCallout() {
  return (
    <div className="mk-cc-wrap">
      <div className="mk-cc">
        <div className="mk-cc-pin" aria-hidden="true">📍</div>
        <div className="mk-cc-text">
          <h3 className="mk-h3">Are you a NSW Central Coast business? You may qualify for a free website.</h3>
          <p>Start with a free store on OzStorehouse, the Central Coast's local marketplace, and grow it into a full website on your own domain.</p>
        </div>
        <a href={OZ_SELLER_URL} className="mk-btn mk-btn-ghost" target="_blank" rel="noopener">Start on OzStorehouse ↗</a>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .mk-cc-wrap { container-type: inline-size; }
        .mk-cc { display: flex; align-items: center; gap: 20px; background: var(--teal-soft); border-radius: 18px; padding: 24px 28px; }
        .mk-cc-pin { font-size: 28px; flex-shrink: 0; }
        .mk-cc-text { flex: 1; }
        .mk-cc-text p { color: var(--muted); margin-top: 6px; font-size: 16px; }
        .mk-cc .mk-btn-ghost { border-color: var(--teal); color: var(--teal); background: #fff; }
        @container (max-width: 720px) { .mk-cc { flex-direction: column; align-items: flex-start; padding: 22px 20px; } }
      ` }} />
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
