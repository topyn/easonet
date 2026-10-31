import Link from 'next/link'
import MarketingLayout, { CtaBand, PRICE } from '../components/marketing/MarketingLayout'
import { CentralCoastCallout, FAQ, FaqList, LiveExample, PriceCard } from '../components/marketing/content'

const FEATURES = [
  { icon: '🏠', title: 'A real website, not a page', text: 'Home, Shop, About, Contact, FAQ and Shipping & returns, all on your own domain and built from what you already know about your business.' },
  { icon: '🛍️', title: 'A shop that sells', text: 'Listings with photos, variants and collections. Customers can buy, make an offer, ask a question or request a commission.' },
  { icon: '🎨', title: 'Your look, in minutes', text: 'Choose from four looks, add your logo and an announcement bar, and preview it on a phone and a computer before it goes live.' },
  { icon: '🌐', title: 'Your own domain', text: 'Connect the address you already own. Our checker tells you exactly what to add and lets you know the moment it works.' },
  { icon: '📈', title: 'See who visits', text: 'Visit stats for your site, so you can see what is working and where people come from.' },
  { icon: '🤝', title: 'A community behind you', text: 'A shared forum and how-tos with other shop owners. Ask questions, share what works and grow together.' },
]

const STEPS = [
  { n: '1', title: 'Pick a look', text: 'Choose one of four looks, add your logo, colours and a short story about you. Add your products with photos and prices.' },
  { n: '2', title: 'Connect your domain', text: 'Add two records where you bought your domain. The live checker shows each step turning green.' },
  { n: '3', title: 'Go live', text: 'Preview on phone and computer, then switch it on. Your shop is open on your own address.' },
]

export default function Home() {
  return (
    <MarketingLayout
      path="/"
      title="easonet: a working online shop on your own domain, plus a community"
      description={`Get a professional online shop on your own domain, with your own look, enquiries, visit stats and a community of shop owners behind you. One plan, ${PRICE} a month, everything included.`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .hm-hero { padding: 72px 0 96px; }
        .hm-hero-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 56px; align-items: center; }
        .hm-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--teal); background: var(--teal-soft); border-radius: 99px; padding: 6px 14px; margin-bottom: 22px; }
        .hm-badge::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--teal); }
        .hm-hero .mk-h1 em { font-style: italic; color: var(--accent); }
        .hm-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 32px; }
        .hm-price-line { margin-top: 18px; font-size: 15px; color: var(--muted); }
        .hm-price-line b { color: var(--ink); }
        .hm-caption { margin-top: 44px; font-size: 14px; color: var(--muted); }
        .hm-caption a { color: var(--accent); font-weight: 600; }
        .hm-steps { counter-reset: s; }
        .hm-step-n { width: 40px; height: 40px; border-radius: 50%; background: var(--ink); color: #fff; font-weight: 600; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
        .hm-community { display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px; align-items: center; }
        .hm-quote-stack { display: grid; gap: 14px; }
        .hm-bubble { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; font-size: 15px; }
        .hm-bubble b { display: block; font-size: 13px; color: var(--muted); font-weight: 500; margin-bottom: 4px; }
        .hm-bubble.reply { margin-left: 40px; background: var(--teal-soft); border-color: transparent; }
        .hm-pricing { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        @media (max-width: 900px) {
          .hm-hero-grid, .hm-community, .hm-pricing { grid-template-columns: 1fr; gap: 40px; }
          .hm-hero { padding: 40px 0 72px; }
        }
      ` }} />

      <section className="hm-hero">
        <div className="mk-wrap hm-hero-grid">
          <div>
            <div className="hm-badge">Opening to the first shops soon</div>
            <h1 className="mk-h1">A working online shop on <em>your own domain</em>, plus a community.</h1>
            <p className="mk-lead">A professional shop that looks like yours, runs on the address you own and comes with a community of shop owners to help you grow. No building, no plugins, no fuss.</p>
            <div className="hm-actions">
              <Link href="/register" className="mk-btn mk-btn-lg">Register interest →</Link>
              <Link href="/#example" className="mk-btn mk-btn-lg mk-btn-ghost">See a live shop</Link>
            </div>
            <p className="hm-price-line"><b>{PRICE}/month</b>, everything included. Cancel any time.</p>
          </div>
          <div id="example">
            <LiveExample />
            <p className="hm-caption">A real shop running on easonet today. <a href="https://inked.ozstorehouse.com" target="_blank" rel="noopener">Visit it live ↗</a></p>
          </div>
        </div>
      </section>

      <section className="mk-section mk-section-alt">
        <div className="mk-wrap">
          <div className="mk-section-head">
            <div className="mk-eyebrow">What you get</div>
            <h2 className="mk-h2">Everything a small shop needs online.</h2>
            <p className="mk-lead">One plan with the lot. No add-ons to buy before your shop actually works.</p>
          </div>
          <div className="mk-grid mk-grid-3">
            {FEATURES.map(f => (
              <div key={f.title} className="mk-card">
                <div className="mk-icon" aria-hidden="true">{f.icon}</div>
                <h3 className="mk-h3">{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 28 }}><Link href="/features" className="mk-btn mk-btn-ghost">See every feature →</Link></p>
        </div>
      </section>

      <section className="mk-section" id="how">
        <div className="mk-wrap">
          <div className="mk-section-head mk-center">
            <div className="mk-eyebrow">How it works</div>
            <h2 className="mk-h2">Three steps to your own shop.</h2>
          </div>
          <div className="mk-grid mk-grid-3 hm-steps">
            {STEPS.map(s => (
              <div key={s.n} className="mk-card">
                <div className="hm-step-n">{s.n}</div>
                <h3 className="mk-h3">{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section mk-section-alt">
        <div className="mk-wrap hm-community">
          <div>
            <div className="mk-eyebrow">The community</div>
            <h2 className="mk-h2">You're not doing this on your own.</h2>
            <p className="mk-lead">Most shop websites stand alone. Every easonet shop joins a shared community of owners: a forum to ask questions and swap ideas, and how-to guides for the things every small shop runs into.</p>
            <ul className="mk-ticks" style={{ marginTop: 24 }}>
              <li>A forum shared with other easonet shop owners and OzStorehouse makers</li>
              <li>How-tos on photos, pricing, descriptions and getting found</li>
              <li>A getting-started checklist for your first weeks</li>
            </ul>
          </div>
          <div className="hm-quote-stack" aria-hidden="true">
            <div className="mk-eyebrow" style={{ color: 'var(--muted)', marginBottom: 0 }}>The kind of thing you'll find</div>
            <div className="hm-bubble"><b>Forum · Getting found</b>What's everyone doing for Christmas cut-off dates? Worth an announcement bar?</div>
            <div className="hm-bubble reply"><b>Reply</b>Yes! I put mine up in early November and pinned my best sellers to the home page.</div>
            <div className="hm-bubble"><b>How-to</b>Taking product photos on your phone that actually sell</div>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap hm-pricing">
          <div>
            <div className="mk-eyebrow">Pricing</div>
            <h2 className="mk-h2">One plan. Everything included.</h2>
            <p className="mk-lead">{PRICE} a month gets you the website, the shop, your domain connected, visit stats and the community. Payments go straight to you, so we never hold your customers' money.</p>
            <p style={{ marginTop: 24 }}><Link href="/pricing" className="mk-btn mk-btn-ghost">Pricing details →</Link></p>
          </div>
          <PriceCard />
        </div>
        <div className="mk-wrap" style={{ marginTop: 48 }}><CentralCoastCallout /></div>
      </section>

      <section className="mk-section mk-section-alt">
        <div className="mk-wrap">
          <div className="mk-section-head mk-center">
            <div className="mk-eyebrow">Questions</div>
            <h2 className="mk-h2">Good to know.</h2>
          </div>
          <FaqList items={FAQ.slice(0, 4)} />
          <p className="mk-center" style={{ marginTop: 28 }}><Link href="/pricing#faq" className="mk-btn mk-btn-ghost">All questions →</Link></p>
        </div>
      </section>

      <CtaBand />
    </MarketingLayout>
  )
}
