import Head from 'next/head'
import dynamic from 'next/dynamic'
const ContactForm = dynamic(() => import('../components/ContactForm'), { ssr: false, loading: () => <div style={{height:320,background:'#101010',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14}} /> })

export default function Homepage() {
  return (
    <>
      <Head>
        <title>Easonet — Built for founders who can't stop starting things</title>
        <meta name="description" content="Every new brand has the same setup headaches. We're building the tools to eliminate them — one by one. Starting with multi-brand email." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #080808; --bg2: #101010; --bg3: #161616;
          --border: rgba(255,255,255,0.08); --border-bright: rgba(255,255,255,0.15);
          --text: #f0f0ee; --muted: #888;
          --accent: #7B6EF6; --accent-bright: #9B8FFF;
          --green: #3ECF8E; --amber: #F5A623;
        }
        html { scroll-behavior: smooth; }
        body {
          background: var(--bg); color: var(--text);
          font-family: 'DM Sans', sans-serif; font-weight: 300;
          line-height: 1.6; overflow-x: hidden;
        }
        body::before {
          content: ''; position: fixed; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px; pointer-events: none; z-index: 0;
        }
        a { color: inherit; text-decoration: none; }
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; flex-direction: row; align-items: center; justify-content: space-between;
          padding: 0 80px; height: 60px; width: 100%;
          background: rgba(8,8,8,0.85); backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          direction: ltr;
        }
        .nav-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; letter-spacing: -0.5px; }
        .nav-logo span { color: var(--accent); }
        .nav-links { display: flex; align-items: center; gap: 32px; list-style: none; }
        .nav-links a { font-size: 13px; color: var(--muted); transition: color .2s; font-weight: 400; }
        .nav-links a:hover { color: var(--text); }
        .nav-cta { display: flex; align-items: center; gap: 12px; }
        .btn-ghost { font-size: 13px; color: var(--muted); padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; transition: all .2s; font-family: 'DM Sans', sans-serif; cursor: pointer; background: transparent; }
        .btn-ghost:hover { border-color: var(--border-bright); color: var(--text); }
        .btn-primary { font-size: 13px; font-weight: 500; color: #fff; padding: 8px 20px; background: var(--accent); border: none; border-radius: 6px; cursor: pointer; transition: all .2s; font-family: 'DM Sans', sans-serif; }
        .btn-primary:hover { background: var(--accent-bright); transform: translateY(-1px); }
        .hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 120px 80px 80px; z-index: 1; }
        .hero-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1px solid rgba(123,110,246,0.3); border-radius: 100px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--accent-bright); background: rgba(123,110,246,0.08); margin-bottom: 40px; letter-spacing: .08em; text-transform: uppercase; }
        .hero-badge::before { content: ''; width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
        .hero h1 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(44px, 6.5vw, 88px); line-height: 1; letter-spacing: -3px; max-width: 860px; margin-bottom: 28px; }
        .hero h1 em { font-style: normal; color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,0.3); }
        .hero-sub { font-size: clamp(15px, 1.8vw, 19px); color: var(--muted); max-width: 500px; margin-bottom: 48px; font-weight: 300; line-height: 1.7; }
        .hero-actions { display: flex; align-items: center; gap: 16px; margin-bottom: 80px; }
        .btn-hero { font-size: 15px; font-weight: 500; color: #fff; padding: 14px 32px; background: var(--accent); border: none; border-radius: 8px; cursor: pointer; transition: all .2s; font-family: 'DM Sans', sans-serif; letter-spacing: -.2px; }
        .btn-hero:hover { background: var(--accent-bright); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(123,110,246,0.3); }
        .btn-hero-ghost { font-size: 15px; color: var(--muted); padding: 14px 32px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all .2s; font-family: 'DM Sans', sans-serif; background: transparent; }
        .btn-hero-ghost:hover { border-color: var(--border-bright); color: var(--text); }
        .hero-terminal { width: 100%; max-width: 640px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; text-align: left; }
        .terminal-bar { display: flex; align-items: center; gap: 6px; padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--bg3); }
        .terminal-dot { width: 10px; height: 10px; border-radius: 50%; }
        .terminal-body { padding: 20px 24px; font-family: 'DM Mono', monospace; font-size: 13px; line-height: 1.8; }
        .t-dim { color: #444; } .t-muted { color: var(--muted); } .t-accent { color: var(--accent-bright); }
        .t-green { color: var(--green); } .t-amber { color: var(--amber); } .t-white { color: var(--text); }
        .full-border-top { border-top: 1px solid var(--border); position: relative; z-index: 1; }
        .logos { text-align: center; padding: 60px 40px; }
        .logos p { font-size: 12px; color: #444; text-transform: uppercase; letter-spacing: .15em; font-family: 'DM Mono', monospace; margin-bottom: 32px; }
        .logos-row { display: flex; align-items: center; justify-content: center; gap: 48px; flex-wrap: wrap; }
        .logo-item { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; color: #2a2a2a; letter-spacing: -0.5px; }
        .section { position: relative; z-index: 1; padding: 100px 80px; max-width: 1400px; margin: 0 auto; width: 100%; }
        .section-label { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--accent); text-transform: uppercase; letter-spacing: .15em; margin-bottom: 16px; }
        .section-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(30px, 4vw, 50px); letter-spacing: -2px; line-height: 1.05; margin-bottom: 20px; }
        .section-sub { font-size: 15px; color: var(--muted); max-width: 460px; margin-bottom: 60px; line-height: 1.7; }
        .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .tool-card { background: var(--bg); padding: 36px 32px; transition: background .2s; position: relative; }
        .tool-card:hover { background: var(--bg2); }
        .tool-card.active { background: var(--bg2); }
        .tool-card.active::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--accent); }
        .tool-status { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 20px; }
        .tool-status.live { color: var(--green); }
        .tool-status.soon { color: #2a2a2a; }
        .tool-status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .tool-status.live .tool-status-dot { animation: pulse 2s infinite; }
        .tool-icon { font-size: 26px; margin-bottom: 16px; display: block; }
        .tool-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 19px; margin-bottom: 10px; letter-spacing: -0.5px; }
        .tool-desc { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 24px; }
        .tool-link { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--accent); display: inline-flex; align-items: center; gap: 6px; transition: gap .2s; }
        .tool-link:hover { gap: 10px; }
        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .step { background: var(--bg); padding: 32px 28px; }
        .step-num { font-family: 'DM Mono', monospace; font-size: 11px; color: #333; margin-bottom: 16px; letter-spacing: .1em; }
        .step-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; margin-bottom: 10px; letter-spacing: -0.3px; }
        .step-desc { font-size: 13px; color: var(--muted); line-height: 1.6; }
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .pricing-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 36px 32px; position: relative; transition: border-color .2s; }
        .pricing-card:hover { border-color: var(--border-bright); }
        .pricing-card.featured { border-color: var(--accent); background: rgba(123,110,246,0.05); }
        .pricing-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--accent); color: #fff; font-size: 11px; font-weight: 500; padding: 4px 14px; border-radius: 100px; white-space: nowrap; font-family: 'DM Mono', monospace; letter-spacing: .05em; }
        .pricing-plan { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .15em; margin-bottom: 16px; }
        .pricing-price { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 48px; letter-spacing: -3px; line-height: 1; margin-bottom: 4px; }
        .pricing-price span { font-size: 16px; font-weight: 400; color: var(--muted); letter-spacing: 0; font-family: 'DM Sans', sans-serif; }
        .pricing-desc { font-size: 13px; color: var(--muted); margin-bottom: 28px; }
        .pricing-divider { height: 1px; background: var(--border); margin: 24px 0; }
        .pricing-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }
        .pricing-features li { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 10px; }
        .pricing-features li::before { content: '→'; color: var(--accent); font-family: 'DM Mono', monospace; font-size: 11px; flex-shrink: 0; }
        .btn-plan { width: 100%; padding: 12px; font-size: 14px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all .2s; font-family: 'DM Sans', sans-serif; border: 1px solid var(--border); background: transparent; color: var(--text); }
        .btn-plan:hover { border-color: var(--border-bright); }
        .btn-plan.featured-btn { background: var(--accent); border-color: var(--accent); color: #fff; }
        .btn-plan.featured-btn:hover { background: var(--accent-bright); border-color: var(--accent-bright); }
        footer { position: relative; z-index: 1; border-top: 1px solid var(--border); padding: 48px 80px; display: flex; align-items: center; justify-content: space-between; max-width: 1400px; margin: 0 auto; width: 100%; }
        .footer-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px; letter-spacing: -0.5px; }
        .footer-logo span { color: var(--accent); }
        .footer-links { display: flex; gap: 28px; list-style: none; }
        .footer-links a { font-size: 13px; color: var(--muted); transition: color .2s; }
        .footer-links a:hover { color: var(--text); }
        .footer-copy { font-size: 12px; color: #333; font-family: 'DM Mono', monospace; }
        @media (max-width: 640px) {
          .tools-grid { grid-template-columns: 1fr; }
          .steps { grid-template-columns: repeat(2, 1fr); }
          .pricing-grid { grid-template-columns: 1fr; }
          nav { padding: 0 24px; }
          .nav-links { display: none; }
          .section { padding: 60px 24px; }
          .hero { padding: 100px 24px 60px; }
          footer { flex-direction: column; gap: 24px; text-align: center; padding: 40px 24px; }
        }
      `}</style>

      {/* NAV */}
      <nav>
        <div className="nav-logo">easonet</div>
        <ul className="nav-links">
          <li><a href="#tools">Tools</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="/setup">Setup guide</a></li>
        </ul>
        <div className="nav-cta">
          <a href="/login"><button className="btn-ghost">Sign in</button></a>
          <a href="/login"><button className="btn-primary">Start free →</button></a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">Platform · Now in beta</div>
        <h1>Built for founders who<br /><em>can't stop</em> starting things</h1>
        <p className="hero-sub">The email tool built for founders who run more than one thing. Send from any domain, read everything in one inbox — before you even launch.</p>
        <div className="hero-actions">
          <a href="/login"><button className="btn-hero">Start free — 30 days</button></a>
          <a href="#problem"><button className="btn-hero-ghost">See how it works →</button></a>
        </div>
        <div className="hero-terminal">
          <div className="terminal-bar">
            <div className="terminal-dot" style={{background:'#FF5F57'}}></div>
            <div className="terminal-dot" style={{background:'#FEBC2E'}}></div>
            <div className="terminal-dot" style={{background:'#28C840'}}></div>
          </div>
          <div className="terminal-body">
            <div><span className="t-dim">$</span> <span className="t-accent">easonet</span> <span className="t-white">send</span></div>
            <div className="t-dim">  ↳ from <span className="t-muted">mark@easonet.com</span></div>
            <div className="t-dim">  ↳ to   <span className="t-muted">john@stuff.com</span></div>
            <div className="t-dim">  ↳ subj <span className="t-muted">"Partnership proposal"</span></div>
            <div>&nbsp;</div>
            <div><span className="t-green">✓</span> <span className="t-muted">Sent from</span> <span className="t-white">mark@easonet.com</span></div>
            <div><span className="t-green">✓</span> <span className="t-muted">Reply routes to</span> <span className="t-white">your single inbox</span></div>
            <div><span className="t-green">✓</span> <span className="t-muted">No separate mailbox needed</span></div>
            <div>&nbsp;</div>
            <div><span className="t-dim">$</span> <span className="t-accent">easonet</span> <span className="t-white">identities</span></div>
            <div className="t-dim">  mark@easonet.com          <span className="t-green">● live</span></div>
            <div className="t-dim">  mark@topyn.com            <span className="t-green">● live</span></div>
            <div className="t-dim">  hello@topyn.com           <span className="t-green">● live</span></div>
            <div className="t-dim">  support@easonet.com       <span className="t-amber">○ dns pending</span></div>
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <div className="full-border-top" id="problem">
        <div style={{maxWidth:'1400px',margin:'0 auto',padding:'0 80px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px',background:'rgba(255,255,255,0.08)'}}>
            <div style={{padding:'60px 48px',background:'#080808'}}>
              <div style={{fontFamily:"'DM Mono', monospace",fontSize:11,color:'#333',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:24}}>// the problem</div>
              <div style={{display:'flex',flexDirection:'column',gap:20}}>
                {[
                  { icon: '✗', text: "You registered 3 domains last month. Now you need professional email for each one — but setting up a mailbox per domain is slow, expensive, and means logging into multiple accounts all day." },
                  { icon: '✗', text: "You're in idea validation mode. You don't want to pay for Google Workspace for a project that might not go anywhere. But using Gmail looks unprofessional to potential customers and partners." },
                  { icon: '✗', text: "A reply to your client pitch went to the wrong inbox. A supplier email got missed for a week. Managing multiple brands across multiple inboxes is a full-time job." },
                ].map((item, i) => (
                  <div key={i} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                    <div style={{fontFamily:"'DM Mono', monospace",fontSize:13,color:'#ff6b6b',marginTop:2,flexShrink:0}}>{item.icon}</div>
                    <div style={{fontSize:14,color:'#555',lineHeight:1.7}}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{padding:'60px 48px',background:'#0d0d0d'}}>
              <div style={{fontFamily:"'DM Mono', monospace",fontSize:11,color:'#7B6EF6',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:24}}>// the easonet way</div>
              <div style={{display:'flex',flexDirection:'column',gap:20}}>
                {[
                  { icon: '✓', text: "Add any email address on any domain you own. Two DNS records, five minutes, and you're sending professional email from that identity." },
                  { icon: '✓', text: "All your brands live in one inbox. Emails are tagged by identity so you always know which business a conversation belongs to. No switching, no confusion." },
                  { icon: '✓', text: "Test new ideas without commitment. Spin up a new brand identity in minutes, validate before you invest. If the idea doesn't fly, just remove it." },
                ].map((item, i) => (
                  <div key={i} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                    <div style={{fontFamily:"'DM Mono', monospace",fontSize:13,color:'#3ECF8E',marginTop:2,flexShrink:0}}>{item.icon}</div>
                    <div style={{fontSize:14,color:'#888',lineHeight:1.7}}>{item.text}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:36}}>
                <a href="/login">
                  <button style={{padding:'11px 28px',background:'#7B6EF6',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:"'DM Sans', sans-serif"}}>
                    Try it free →
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLS */}
      <section className="section" id="tools">
        <div className="section-label">// tools</div>
        <h2 className="section-title">Everything a new brand<br />needs to get started.</h2>
        <p className="section-sub">We're building tools in the order you actually need them — from first email to first invoice.</p>
        <div className="tools-grid">
          <div className="tool-card active">
            <div className="tool-status live"><div className="tool-status-dot"></div> Live now</div>
            <span className="tool-icon">✉</span>
            <div className="tool-name">Multi-brand email</div>
            <p className="tool-desc">Send and receive from unlimited domain identities. One inbox, every brand. No separate mailboxes needed.</p>
            <a href="/login" className="tool-link">Open inbox →</a>
          </div>
          {[
            { icon: '◈', name: 'Domain manager', desc: 'All your domains in one place. Track renewals, manage DNS records, and monitor health across every registrar.' },
            { icon: '⬡', name: 'Brand landing pages', desc: 'A clean branded page for every project before the full site is ready. Links, contact form, social handles — live in minutes.' },
            { icon: '⊡', name: 'Contact forms', desc: 'Embeddable forms that route enquiries straight to your easonet inbox — already tagged with which brand they came from.' },
            { icon: '◻', name: 'Invoices & quotes', desc: 'Send professional invoices from any brand identity. Switch sender the same way you switch email — no separate accounts.' },
          ].map(t => (
            <div key={t.name} className="tool-card">
              <div className="tool-status soon"><div className="tool-status-dot"></div> Coming soon</div>
              <span className="tool-icon" style={{opacity:.25}}>{t.icon}</span>
              <div className="tool-name" style={{color:'#2a2a2a'}}>{t.name}</div>
              <p className="tool-desc" style={{color:'#2a2a2a'}}>{t.desc}</p>
              <span className="tool-link" style={{color:'#2a2a2a'}}>Join waitlist →</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="full-border-top">
        <section className="section" id="how">
          <div className="section-label">// how it works</div>
          <h2 className="section-title">From zero to professional<br />email in 5 minutes</h2>
          <p className="section-sub">No mail servers to manage. No expensive workspace subscriptions. Just two DNS records and you're live.</p>
          <div className="steps">
            {[
              { n: '01', title: 'Sign up free', desc: 'Create an account in 30 seconds. 30-day trial, no credit card. Start with up to 3 domain identities.' },
              { n: '02', title: 'Add an identity', desc: 'Enter any email on any domain you own — mark@yourbrand.com, hello@project.io, anything. We show you the exact DNS records to add.' },
              { n: '03', title: 'Verify in seconds', desc: 'Our live DNS checker polls every few seconds and confirms the moment your records propagate. Usually under 5 minutes.' },
              { n: '04', title: 'Send & receive', desc: 'Compose emails from any identity. Replies arrive in your unified inbox, tagged by brand so you always know which business it belongs to.' },
            ].map(s => (
              <div key={s.n} className="step">
                <div className="step-num">{s.n} —</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* PRICING */}
      <div className="full-border-top">
        <section className="section" id="pricing">
          <div className="section-label">// pricing</div>
          <h2 className="section-title">Simple pricing.<br />Scale as you grow.</h2>
          <p className="section-sub">Priced per domain, not per email. Add a new brand in minutes, not days.</p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-plan">Starter</div>
              <div className="pricing-price">$9<span>.99/mo</span></div>
              <p className="pricing-desc">For founders with a handful of brands</p>
              <div className="pricing-divider"></div>
              <ul className="pricing-features">
                <li>Up to 5 domain identities</li>
                <li>Unified inbox</li>
                <li>DNS wizard</li>
                <li>Thread history</li>
              </ul>
              <a href="/login"><button className="btn-plan">Start free trial</button></a>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge">Most popular</div>
              <div className="pricing-plan">Growth</div>
              <div className="pricing-price">$19<span>.99/mo</span></div>
              <p className="pricing-desc">For active multi-brand operators</p>
              <div className="pricing-divider"></div>
              <ul className="pricing-features">
                <li>Up to 20 domain identities</li>
                <li>Everything in Starter</li>
                <li>Priority support</li>
                <li>Early access to new tools</li>
              </ul>
              <a href="/login"><button className="btn-plan featured-btn">Start free trial</button></a>
            </div>
            <div className="pricing-card">
              <div className="pricing-plan">Pro</div>
              <div className="pricing-price">$34<span>.99/mo</span></div>
              <p className="pricing-desc">For agencies and power users</p>
              <div className="pricing-divider"></div>
              <ul className="pricing-features">
                <li>Unlimited domain identities</li>
                <li>Everything in Growth</li>
                <li>API access</li>
                <li>Team members (coming soon)</li>
              </ul>
              <a href="/login"><button className="btn-plan">Start free trial</button></a>
            </div>
          </div>
        </section>
      </div>

      {/* CONTACT */}
      <div className="full-border-top" id="contact">
        <section className="section">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'80px',alignItems:'start'}}>
            <div>
              <div className="section-label">// get in touch</div>
              <h2 className="section-title">Questions?<br />We'd love to hear from you.</h2>
              <p style={{fontSize:15,color:'#666',lineHeight:1.8,marginTop:16}}>
                Whether you're wondering if easonet is right for your situation, need help with DNS setup, or just want to say hello — send us a message and we'll get back to you within 24 hours.
              </p>
              <div style={{marginTop:32,display:'flex',flexDirection:'column',gap:14}}>
                {[
                  {icon:'✉', text:'Reply from mark@easonet.com'},
                  {icon:'⏱', text:'Response within 24 hours'},
                  {icon:'◈', text:'Real human, not a bot'},
                ].map(item => (
                  <div key={item.text} style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{fontFamily:"'DM Mono', monospace",fontSize:14,color:'#7B6EF6',width:20}}>{item.icon}</div>
                    <div style={{fontSize:14,color:'#555'}}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
            <ContactForm />
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="full-border-top">
        <footer>
          <div className="footer-logo">easonet</div>
          <ul className="footer-links">
            <li><a href="#tools">Tools</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#contact">Contact</a></li>
            <li><a href="/login">Sign in</a></li>
          </ul>
          <div className="footer-copy">© 2026 easonet</div>
        </footer>
      </div>
    </>
  )
}
