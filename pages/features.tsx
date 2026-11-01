import MarketingLayout, { CtaBand, PRICE } from '../components/marketing/MarketingLayout'
import { FEATURE_GROUPS as GROUPS } from '../components/marketing/content'


export default function Features() {
  return (
    <MarketingLayout
      path="/features"
      title="Features | easonet"
      description={`Everything included in an easonet shop: website on your own domain, product pages, blog, enquiries, email on your own domain, self-serve domain connection, visit stats and a shop-owner community. ${PRICE}/month.`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .ft-group { display: grid; grid-template-columns: 300px 1fr; gap: 48px; padding: 56px 0; border-top: 1px solid var(--line); }
        .ft-group:first-of-type { border-top: 0; padding-top: 16px; }
        .ft-group .mk-lead { font-size: 17px; }
        .ft-items { display: grid; grid-template-columns: 1fr 1fr; gap: 28px 32px; }
        .ft-items h3 { font-size: 17px; font-weight: 600; }
        .ft-items p { color: var(--muted); font-size: 16px; margin-top: 4px; }
        @media (max-width: 900px) { .ft-group { grid-template-columns: 1fr; gap: 24px; } }
        @media (max-width: 640px) { .ft-items { grid-template-columns: 1fr; } }
      ` }} />

      <section className="mk-section" style={{ paddingBottom: 24 }}>
        <div className="mk-wrap">
          <div className="mk-eyebrow">Features</div>
          <h1 className="mk-h1">Everything included. <br />One price.</h1>
          <p className="mk-lead">Every easonet shop gets all of this for {PRICE} a month. No tiers, no add-ons needed to get going.</p>
        </div>
      </section>

      <section style={{ paddingBottom: 72 }}>
        <div className="mk-wrap">
          {GROUPS.map(g => (
            <div key={g.title} className="ft-group">
              <div>
                <h2 className="mk-h2" style={{ fontSize: 32 }}>{g.title}</h2>
                <p className="mk-lead">{g.intro}</p>
              </div>
              <div className="ft-items">
                {g.items.map(i => (
                  <div key={i.name}>
                    <h3>{i.name}{i.soon && <span className="mk-tag">Coming soon</span>}</h3>
                    <p>{i.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </MarketingLayout>
  )
}
