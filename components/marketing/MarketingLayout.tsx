import Head from 'next/head'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

// Shared chrome for the public easonet web-shop marketing pages (/, /features, /pricing,
// /register, /privacy). The logged-in tools (/app, /stores, ...) keep their own styling.

export const PRICE = 'A$49.99'

const NAV = [
  { href: '/features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/pricing#faq', label: 'FAQ' },
]

export default function MarketingLayout({ title, description, path, children }: {
  title: string
  description: string
  path: string
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const url = `https://easonet.com${path}`

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#FBF7F1" />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="easonet" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content="https://easonet.com/showcase/example-desktop.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Sans:wght@400;500;600&family=Syne:wght@800&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <a href="#main" className="mk-skip">Skip to content</a>
      <header className="mk-header">
        <div className="mk-wrap mk-header-row">
          <Link href="/" className="mk-logo" aria-label="easonet home">easonet</Link>
          <nav className={`mk-nav${menuOpen ? ' open' : ''}`} aria-label="Main">
            {NAV.map(n => <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</Link>)}
            <Link href="/login" className="mk-signin">Sign in</Link>
          </nav>
          <div className="mk-header-cta">
            <Link href="/register" className="mk-btn mk-btn-sm">Register interest</Link>
            <button className="mk-menu" aria-expanded={menuOpen} aria-label="Menu" onClick={() => setMenuOpen(o => !o)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer className="mk-footer">
        <div className="mk-wrap mk-footer-row">
          <div>
            <div className="mk-logo">easonet</div>
            <p className="mk-footer-tag">A working online shop on your own domain, plus a community.</p>
          </div>
          <nav className="mk-footer-links" aria-label="Footer">
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/pricing#faq">FAQ</Link>
            <Link href="/register">Register interest</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/login">Sign in</Link>
          </nav>
        </div>
        <div className="mk-wrap mk-footer-copy">© {new Date().getFullYear()} easonet · Made on the Central Coast, NSW · Prices in Australian dollars</div>
      </footer>
    </>
  )
}

export function CtaBand({ heading = 'Be one of the first shops on easonet', text = "We're opening to a small group of shops first. Register your interest and we'll be in touch personally." }: { heading?: string; text?: string }) {
  return (
    <section className="mk-cta-band">
      <div className="mk-wrap mk-cta-inner">
        <div>
          <h2 className="mk-h2">{heading}</h2>
          <p className="mk-lead">{text}</p>
        </div>
        <Link href="/register" className="mk-btn mk-btn-lg mk-btn-light">Register interest →</Link>
      </div>
    </section>
  )
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
:root {
  --bg: #FBF7F1; --bg2: #F3ECE1; --card: #FFFFFF; --ink: #221D17; --muted: #6B6158;
  --line: #E6DCCD; --accent: #B4502F; --accent-dark: #933D21; --accent-soft: #F6E3D8;
  --teal: #245E58; --teal-soft: #DDEBE7;
}
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: 'DM Sans', system-ui, sans-serif; font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
a { color: inherit; }
img { max-width: 100%; display: block; }
h1, h2, h3 { margin: 0; }
p { margin: 0; }
.mk-wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
.mk-skip { position: absolute; left: -999px; top: 8px; background: var(--ink); color: #fff; padding: 8px 14px; border-radius: 6px; z-index: 200; }
.mk-skip:focus { left: 8px; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

.mk-header { position: sticky; top: 0; z-index: 100; background: rgba(251,247,241,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.mk-header-row { display: flex; align-items: center; gap: 32px; height: 68px; }
.mk-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; text-decoration: none; color: var(--ink); }
.mk-nav { display: flex; align-items: center; gap: 26px; flex: 1; }
.mk-nav a { text-decoration: none; font-size: 15px; color: var(--muted); font-weight: 500; }
.mk-nav a:hover { color: var(--ink); }
.mk-nav .mk-signin { margin-left: auto; }
.mk-header-cta { display: flex; align-items: center; gap: 10px; }
.mk-menu { display: none; background: none; border: 1px solid var(--line); border-radius: 8px; width: 42px; height: 40px; cursor: pointer; flex-direction: column; justify-content: center; align-items: center; gap: 4px; }
.mk-menu span { display: block; width: 18px; height: 2px; background: var(--ink); border-radius: 2px; }

.mk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--accent); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 13px 24px; border-radius: 10px; border: 0; cursor: pointer; font-family: inherit; transition: background .15s, transform .15s; white-space: nowrap; }
.mk-btn:hover { background: var(--accent-dark); transform: translateY(-1px); }
.mk-btn:disabled { opacity: .6; cursor: default; transform: none; }
.mk-btn-sm { font-size: 14px; padding: 9px 16px; border-radius: 8px; }
.mk-btn-lg { font-size: 17px; padding: 15px 28px; }
.mk-btn-ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--line); }
.mk-btn-ghost:hover { background: var(--card); border-color: var(--ink); }
.mk-btn-light { background: #fff; color: var(--ink); }
.mk-btn-light:hover { background: var(--accent-soft); }

.mk-section { padding: 88px 0; }
.mk-section-alt { background: var(--bg2); }
.mk-eyebrow { font-size: 13px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
.mk-h1 { font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: clamp(38px, 5.6vw, 64px); line-height: 1.05; letter-spacing: -1.2px; }
.mk-h2 { font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: clamp(30px, 3.6vw, 44px); line-height: 1.1; letter-spacing: -0.8px; }
.mk-h3 { font-size: 19px; font-weight: 600; line-height: 1.3; }
.mk-lead { font-size: clamp(17px, 1.6vw, 20px); color: var(--muted); max-width: 620px; margin-top: 16px; }
.mk-section-head { margin-bottom: 48px; }
.mk-center { text-align: center; }
.mk-center .mk-lead { margin-left: auto; margin-right: auto; }

.mk-grid { display: grid; gap: 20px; }
.mk-grid-3 { grid-template-columns: repeat(3, 1fr); }
.mk-grid-2 { grid-template-columns: repeat(2, 1fr); }
.mk-card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 28px; }
.mk-card p { color: var(--muted); margin-top: 8px; font-size: 16px; }
.mk-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px; }
.mk-tag { display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 99px; background: var(--teal-soft); color: var(--teal); vertical-align: middle; margin-left: 6px; }

.mk-ticks { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.mk-ticks li { position: relative; padding-left: 30px; }
.mk-ticks li::before { content: ''; position: absolute; left: 0; top: 4px; width: 20px; height: 20px; border-radius: 50%; background: var(--teal-soft) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M5.5 10.5l3 3 6-7' fill='none' stroke='%23245E58' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/20px no-repeat; }

.mk-price-card { background: var(--card); border: 2px solid var(--ink); border-radius: 22px; padding: 36px; max-width: 520px; width: 100%; }
.mk-price { font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 60px; letter-spacing: -2px; line-height: 1; }
.mk-price small { font-family: 'DM Sans', sans-serif; font-size: 18px; font-weight: 500; color: var(--muted); letter-spacing: 0; }
.mk-price-note { color: var(--muted); font-size: 15px; margin: 10px 0 24px; }

.mk-faq { max-width: 780px; margin: 0 auto; }
.mk-faq details { border-bottom: 1px solid var(--line); }
.mk-faq summary { list-style: none; cursor: pointer; padding: 22px 40px 22px 0; font-weight: 600; font-size: 18px; position: relative; }
.mk-faq summary::-webkit-details-marker { display: none; }
.mk-faq summary::after { content: '+'; position: absolute; right: 4px; top: 16px; font-size: 26px; font-weight: 400; color: var(--accent); }
.mk-faq details[open] summary::after { content: '–'; }
.mk-faq details p { color: var(--muted); padding: 0 0 22px; max-width: 680px; }

.mk-cta-band { background: var(--teal); color: #fff; padding: 64px 0; }
.mk-cta-band .mk-lead { color: rgba(255,255,255,0.82); }
.mk-cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 32px; }

.mk-footer { border-top: 1px solid var(--line); padding: 48px 0 32px; }
.mk-footer-row { display: flex; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
.mk-footer-tag { color: var(--muted); font-size: 15px; margin-top: 6px; }
.mk-footer-links { display: flex; flex-wrap: wrap; gap: 10px 24px; align-items: center; }
.mk-footer-links a { text-decoration: none; color: var(--muted); font-size: 15px; }
.mk-footer-links a:hover { color: var(--ink); }
.mk-footer-copy { color: var(--muted); font-size: 13px; margin-top: 32px; }

.mk-field { display: grid; gap: 6px; }
.mk-field label { font-weight: 600; font-size: 15px; }
.mk-field .hint { font-weight: 400; color: var(--muted); }
.mk-input { width: 100%; font: inherit; font-size: 16px; padding: 12px 14px; border: 1.5px solid var(--line); border-radius: 10px; background: #fff; color: var(--ink); }
.mk-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }

@media (max-width: 900px) {
  .mk-grid-3 { grid-template-columns: 1fr 1fr; }
  .mk-menu { display: flex; }
  .mk-nav { display: none; position: absolute; top: 68px; left: 0; right: 0; background: var(--bg); border-bottom: 1px solid var(--line); flex-direction: column; align-items: stretch; gap: 0; padding: 8px 24px 16px; }
  .mk-nav.open { display: flex; }
  .mk-nav a { padding: 12px 0; font-size: 17px; border-bottom: 1px solid var(--line); }
  .mk-nav .mk-signin { margin-left: 0; border-bottom: 0; }
  .mk-header-row { justify-content: space-between; }
  .mk-cta-inner { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 640px) {
  body { font-size: 16px; }
  .mk-wrap { padding: 0 16px; }
  .mk-grid-3, .mk-grid-2 { grid-template-columns: 1fr; }
  .mk-section { padding: 60px 0; }
  .mk-header-cta .mk-btn-sm { padding: 8px 12px; font-size: 13px; }
  .mk-price-card { padding: 26px 22px; }
}
`
