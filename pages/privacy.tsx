import MarketingLayout from '../components/marketing/MarketingLayout'

export default function Privacy() {
  return (
    <MarketingLayout
      path="/privacy"
      title="Privacy | easonet"
      description="How easonet handles the details you give us when you register your interest or contact us."
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .pv { max-width: 720px; }
        .pv h2 { font-size: 20px; font-weight: 600; margin: 32px 0 8px; }
        .pv p, .pv li { color: var(--muted); }
        .pv ul { padding-left: 20px; }
        .pv a { color: var(--accent); }
      ` }} />
      <section className="mk-section">
        <div className="mk-wrap pv">
          <div className="mk-eyebrow">Privacy</div>
          <h1 className="mk-h1" style={{ fontSize: 44 }}>Your details, kept simple.</h1>

          <h2>What we collect</h2>
          <p>When you register your interest or contact us, we keep what you type into the form: your name, email address and anything you tell us about your business.</p>

          <h2>What we use it for</h2>
          <ul>
            <li>To contact you about setting up your easonet shop.</li>
            <li>To answer your questions.</li>
          </ul>
          <p style={{ marginTop: 8 }}>We don't sell your details or share them with anyone else for marketing.</p>

          <h2>Where it's kept</h2>
          <p>Your details are stored in our database in Sydney, Australia, and in our email inbox.</p>

          <h2>Changing your mind</h2>
          <p>Ask us to update or delete your details at any time by emailing <a href="mailto:mark@easonet.com">mark@easonet.com</a>.</p>
        </div>
      </section>
    </MarketingLayout>
  )
}
