import MarketingLayout, { CtaBand, PRICE } from '../components/marketing/MarketingLayout'

const GROUPS: { title: string; intro: string; items: { name: string; text: string; soon?: boolean }[] }[] = [
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
