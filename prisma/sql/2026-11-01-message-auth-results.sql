-- Sender checks (SPF/DKIM/DMARC) per inbound message — see lib/inbound/auth.ts.
-- Additive and nullable: safe to run before deploying the code that writes it.
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "authResults" JSONB;
