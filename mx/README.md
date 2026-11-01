# easonet MX — inbound mail for seller domains

Receives email for seller domains we host (`MX 10 mx1.easonet.com`, `MX 20 mx2.easonet.com`) and
hands it to the easonet inbox. **Inbound only** — it never sends or relays mail; replies go out
through Amazon SES from the easonet app.

Design: `docs/specs/seller-domain-email-spec-2026-10-31.md` in the ozstorehouse repo.

## How a message flows

1. `RCPT TO` is checked against an in-memory address list pulled from
   `GET /api/mail/address-list` every minute. Unknown users → `550 5.1.1`, other domains →
   `550 5.7.1 Relaying denied`. Nothing is accepted that we'd later have to bounce.
2. After `DATA`: SPF/DKIM/DMARC/ARC via `mailauth`; DMARC `p=reject` failures → `550`;
   optional rspamd score.
3. Raw `.eml` → Supabase Storage via a one-time signed URL from `POST /api/mail/upload-url`
   (this box holds no Supabase key; Vercel's 4.5 MB request limit never applies).
4. `POST /api/mail/ingest` with the storage path, checksum, envelope and auth results.
5. Only when ingest returns 200 do we answer `250`. Anything else → `451`, and the sending
   server retries. easonet dedupes retries on (checksum, recipient).

All calls to easonet are HMAC-signed with `MAIL_HMAC_SECRET` (see `src/easonet.mjs` and
easonet `lib/inbound/signature.ts`).

## Run the tests

```bash
npm install
npm test
```

The tests run real SMTP conversations against a fake easonet that checks every signature.

## Deploy (one server)

On a fresh Ubuntu 24.04 VPS in Sydney:

1. Point `mx1.easonet.com` (A record, **not** proxied if on Cloudflare) at the server, and set
   the provider's reverse DNS (PTR) for the IP to `mx1.easonet.com`.
2. Firewall: allow inbound 22 (your IP only), 25, 80 (certbot renewals). Nothing else.
3. Install Docker (`apt install docker.io docker-compose-v2 certbot`), copy this folder to
   `/opt/easonet-mx/app`, then:
   ```bash
   cd /opt/easonet-mx/app
   install -m 755 deploy/certbot-deploy-hook.sh /etc/letsencrypt/renewal-hooks/deploy/easonet-mx.sh
   certbot certonly --standalone -d mx1.easonet.com --agree-tos --register-unsafely-without-email
   # certbot runs deploy hooks on the first issue too; this re-run is harmless
   MX_HOSTNAME=mx1.easonet.com /etc/letsencrypt/renewal-hooks/deploy/easonet-mx.sh
   cp .env.example .env && chmod 600 .env   # fill in MAIL_HMAC_SECRET
   docker compose up -d --build
   ```
   The hook copies the cert to `/opt/easonet-mx/tls` (the container runs as `node` and can't read
   root-only `/etc/letsencrypt` keys) and sends SIGHUP on every renewal.
4. Check: `curl localhost:8025` → `{"ok":true,...}`, and from another machine
   `nc mx1.easonet.com 25` shows the `easonet mail` banner.
5. Uptime monitor on port 25 (TCP) and on the health endpoint (via an SSH tunnel or a small
   reverse proxy); alert Mark.
6. Turn on unattended security updates: `sudo apt install unattended-upgrades`.

`mx2` is the same steps on a second provider with `MX_HOSTNAME=mx2.easonet.com`.
