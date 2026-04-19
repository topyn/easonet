import type { NextApiRequest, NextApiResponse } from 'next'
import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)
const resolveTxt = promisify(dns.resolveTxt)
const resolveCname = promisify(dns.resolveCname)

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { domain } = req.query
  if (!domain || typeof domain !== 'string') return res.status(400).json({ error: 'Domain required' })

  const d = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()

  const [mx, txt, dkim1, dkim2] = await Promise.all([
    safe(() => resolveMx(d)),
    safe(() => resolveTxt(d)),
    safe(() => resolveCname(`brevo1._domainkey.${d}`)),
    safe(() => resolveCname(`brevo2._domainkey.${d}`)),
  ])

  const mxRecords = mx ?? []
  const hasCloudflareRouting = mxRecords.some(r => r.exchange.includes('mx.cloudflare.net'))
  const hasGodaddyMx = mxRecords.some(r => r.exchange.includes('secureserver.net'))
  const hasGoogleMx = mxRecords.some(r => r.exchange.includes('google.com') || r.exchange.includes('googlemail.com'))
  const hasMicrosoftMx = mxRecords.some(r => r.exchange.includes('outlook.com') || r.exchange.includes('protection.outlook.com'))

  const txtRecords = (txt ?? []).map(t => t.join(''))
  const spfRecord = txtRecords.find(t => t.startsWith('v=spf1'))
  const hasBrevoSpf = spfRecord?.includes('_spf.brevo.com') ?? false
  const dmarcRecord = (await safe(() => resolveTxt(`_dmarc.${d}`)) ?? []).map(t => t.join('')).find(t => t.startsWith('v=DMARC1'))

  const hasDkim1 = !!dkim1
  const hasDkim2 = !!dkim2

  let currentProvider = 'Unknown'
  if (hasCloudflareRouting) currentProvider = 'Cloudflare Email Routing'
  else if (hasGodaddyMx) currentProvider = 'GoDaddy Email'
  else if (hasGoogleMx) currentProvider = 'Google Workspace'
  else if (hasMicrosoftMx) currentProvider = 'Microsoft 365'
  else if (mxRecords.length > 0) currentProvider = mxRecords[0].exchange

  return res.json({
    domain: d,
    currentProvider,
    mx: {
      records: mxRecords.sort((a, b) => a.priority - b.priority),
      hasCloudflareRouting,
      status: hasCloudflareRouting ? 'ok' : mxRecords.length === 0 ? 'missing' : 'wrong',
    },
    spf: {
      record: spfRecord ?? null,
      hasBrevoSpf,
      status: !spfRecord ? 'missing' : hasBrevoSpf ? 'ok' : 'needs-update',
    },
    dkim: {
      brevo1: hasDkim1,
      brevo2: hasDkim2,
      status: hasDkim1 && hasDkim2 ? 'ok' : hasDkim1 || hasDkim2 ? 'partial' : 'missing',
    },
    dmarc: {
      record: dmarcRecord ?? null,
      status: dmarcRecord ? 'ok' : 'missing',
    },
    allGood: hasCloudflareRouting && hasBrevoSpf && hasDkim1 && hasDkim2,
  })
}
