# Multi-brand Email PoC

Send and receive email from multiple domain identities through a single interface.
Built on Next.js + Vercel + Brevo + Cloudflare Email Routing. **Zero cost to run.**

---

## Architecture

```
[Client UI] → [Next.js API on Vercel] → [Brevo SMTP] → recipient
recipient → [Cloudflare Email Routing] → [/api/inbound/receive webhook] → [Postgres]
```

---

## Setup (30-45 minutes)

### 1. Clone and install

```bash
git clone <your-repo>
cd multibrand-email
npm install
```

### 2. Database — Vercel Postgres (free)

1. Go to vercel.com → Storage → Create → Postgres
2. Connect to your project — it auto-populates env vars
3. Or use Supabase free tier and copy the connection strings manually

### 3. Brevo SMTP (free, 300 emails/day)

1. Sign up at brevo.com
2. Go to **SMTP & API → SMTP**
3. Copy your login email and generate an SMTP key
4. Paste into `.env.local` as `BREVO_SMTP_USER` and `BREVO_SMTP_KEY`

**Verify your sender domains in Brevo:**
- Go to Senders & IP → Domains → Add a domain
- For each domain (easonet.com, survivalstorehouse.com, etc.), add the SPF/DKIM records they give you

### 4. Cloudflare Email Routing (inbound, free)

For domains already on Cloudflare:
1. Go to your domain → **Email → Email Routing**
2. Enable Email Routing — Cloudflare adds MX records automatically
3. Add a **catch-all rule**: action = **Send to a Worker** or **Forward to** your webhook

For domains NOT on Cloudflare — move them, or use ImprovMX:
1. Sign up at improvmx.com (free up to 25 domains)
2. Add your domain, set MX records as instructed
3. Forward all mail to your webhook URL (ImprovMX supports webhook forwarding on paid plan)
   - Alternative: forward to a mailbox, then poll via IMAP (more complex)

### 5. Configure inbound webhook

Your inbound webhook endpoint is:
```
https://your-vercel-app.vercel.app/api/inbound/receive
```

Set a strong random secret:
```bash
openssl rand -hex 32
```

Paste it as `INBOUND_WEBHOOK_SECRET` in your env vars, and set the same value as the
webhook secret header (`x-webhook-secret`) in your forwarding service config.

**Brevo inbound webhook setup:**
1. Go to Inbound Parsing in Brevo
2. Set your domain's MX to Brevo's inbound server
3. Point the webhook to your `/api/inbound/receive` URL

**Cloudflare Worker approach** (most control):
Create a Worker that forwards the raw email to your webhook:
```js
export default {
  async email(message, env) {
    const raw = await new Response(message.raw).arrayBuffer()
    await fetch('https://your-app.vercel.app/api/inbound/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'message/rfc822',
        'x-webhook-secret': env.WEBHOOK_SECRET,
        'x-forwarded-to': message.to,
      },
      body: raw,
    })
  }
}
```

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all env vars in Vercel dashboard → Settings → Environment Variables.

### 7. Run database migrations

```bash
npx prisma db push
```

### 8. Add your first identity

Open the app, click **+ Add identity**, enter name + email.
Follow the DNS instructions shown in the modal.

---

## Adding a new domain (5 minutes per domain)

1. Add identity in the UI (name + email address)
2. Add domain to Brevo sender verification
3. Set DNS records on the domain:
   - **MX**: point to Cloudflare Email Routing or ImprovMX
   - **SPF TXT**: `v=spf1 include:_spf.brevo.com ~all`
   - **DKIM TXT**: from Brevo domain verification page
4. Done — emails sent from this identity will appear to come from that domain

---

## Migrating to your own infrastructure

When ready to move off free tiers:

| Current | Replace with |
|---|---|
| Brevo SMTP | Postal (self-hosted) or AWS SES |
| Cloudflare Email Routing | Postfix/Dovecot on a VPS |
| Vercel Postgres | Supabase Pro or self-hosted Postgres |
| Vercel API | Node.js on a VPS (same code, `npm start`) |

The API code doesn't change — just swap the env vars.

---

## Project structure

```
/pages
  index.tsx              — email client UI
  /api
    /identities
      index.ts           — GET list / POST create identity
    /emails
      send.ts            — POST send email
      threads.ts         — GET list threads
    /inbound
      receive.ts         — POST inbound webhook
/lib
  prisma.ts              — db client singleton
  mailer.ts              — nodemailer send wrapper
/prisma
  schema.prisma          — Identity, Thread, Message models
```
