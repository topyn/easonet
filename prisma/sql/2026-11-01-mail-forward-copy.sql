-- Optional "also send a copy to my personal email" per seller mail domain — see
-- lib/inbound/forwardCopy.ts. Copies only go out once the address is confirmed
-- (forwardCopyVerifiedAt set), so the setting can't be used to relay mail to strangers.
-- Additive and nullable: safe to run before deploying the code that reads it.
ALTER TABLE "MailDomain" ADD COLUMN IF NOT EXISTS "forwardCopyTo" TEXT;
ALTER TABLE "MailDomain" ADD COLUMN IF NOT EXISTS "forwardCopyVerifiedAt" TIMESTAMP(3);
