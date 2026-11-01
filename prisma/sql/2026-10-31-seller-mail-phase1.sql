-- Seller-domain mail, phase 1 (31 Oct 2026). Additive only.
-- Generated with `prisma migrate diff` from schema.prisma, plus RLS (every easonet table has
-- row-level security on with no policies, so only the server's service connection can read
-- them) and the private bucket our MX servers upload raw messages to.
-- Run in the easonet-Sydney project (jyokhmesnloozlnpregv), not the OzStorehouse one.

-- AlterTable
ALTER TABLE "Identity" ADD COLUMN     "retiresAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "MailDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ozAccountId" TEXT,
    "dnsMode" TEXT NOT NULL DEFAULT 'manual',
    "inboundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mxVerified" BOOLEAN NOT NULL DEFAULT false,
    "catchAll" BOOLEAN NOT NULL DEFAULT false,
    "dailySendCap" INTEGER NOT NULL DEFAULT 100,
    "sendingPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundReceipt" (
    "id" TEXT NOT NULL,
    "rawSha256" TEXT NOT NULL,
    "envelopeTo" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "threadId" TEXT,
    "result" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailDomain_domain_key" ON "MailDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "InboundReceipt_rawSha256_envelopeTo_key" ON "InboundReceipt"("rawSha256", "envelopeTo");

-- AddForeignKey
ALTER TABLE "MailDomain" ADD CONSTRAINT "MailDomain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Match every other easonet table: RLS on, no policies.
ALTER TABLE "MailDomain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InboundReceipt" ENABLE ROW LEVEL SECURITY;

-- Private bucket for raw inbound .eml files (25 MB cap, same as the MX SIZE limit).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('inbound-raw', 'inbound-raw', false, 26214400)
ON CONFLICT (id) DO NOTHING;
