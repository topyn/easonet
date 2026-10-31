import MarketingLayout, { CtaBand, PRICE } from '../components/marketing/MarketingLayout'
import { CentralCoastCallout, FaqList, PriceCard } from '../components/marketing/content'

export default function Pricing() {
  return (
    <MarketingLayout
      path="/pricing"
      title="Pricing | easonet"
      description={`One plan: ${PRICE} a month for your shop on your own domain, with everything included and no lock-in.`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .pr-top { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
        .pr-notes { display: grid; gap: 20px; margin-top: 32px; }
        .pr-notes h3 { font-size: 17px; font-weight: 600; }
        .pr-notes p { color: var(--muted); font-size: 16px; margin-top: 2px; }
        @media (max-width: 900px) { .pr-top { grid-template-columns: 1fr; gap: 40px; } }
      ` }} />

      <section className="mk-section">
        <div className="mk-wrap pr-top">
          <div>
            <div className="mk-eyebrow">Pricing</div>
            <h1 className="mk-h1">One plan. Everything included.</h1>
            <p className="mk-lead">No tiers to compare and nothing important held back. Your shop, your domain and the community, for one monthly price.</p>
            <div className="pr-notes">
              <div><h3>Your sales are yours</h3><p>Customers pay you directly, through your own PayPal or however you already take payment. We never hold your customers' money.</p></div>
              <div><h3>Your domain stays yours</h3><p>You keep your domain wherever you bought it. You just point it at your shop.</p></div>
              <div><h3>No lock-in</h3><p>Pay monthly and cancel any time.</p></div>
            </div>
          </div>
          <PriceCard />
        </div>
        <div className="mk-wrap" style={{ marginTop: 48 }}><CentralCoastCallout /></div>
      </section>

      <section className="mk-section mk-section-alt" id="faq">
        <div className="mk-wrap">
          <div className="mk-section-head mk-center">
            <div className="mk-eyebrow">FAQ</div>
            <h2 className="mk-h2">Questions, answered.</h2>
            <p className="mk-lead">Something we haven't covered? Ask when you register your interest and we'll get back to you.</p>
          </div>
          <FaqList />
        </div>
      </section>

      <CtaBand heading={`${PRICE} a month. Everything included.`} />
    </MarketingLayout>
  )
}
