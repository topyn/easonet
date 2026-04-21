import type { NextApiRequest, NextApiResponse } from 'next'
import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)
const resolveTxt = promisify(dns.resolveTxt)
const resolveCname = promisify(dns.resolveCname)
const resolve4 = promisify(dns.resolve4)

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

interface Conflict { type: string; severity: 'error' | 'warning'; message: string; fix: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { domain } = req.query
  if (!domain || typeof domain !== 'string') return res.status(400).json({ error: 'Domain required' })

  const d = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()

  const [mx, txt, dkim1, dkim2, aRecords] = await Promise.all([
    safe(() => resolveMx(d)),
    safe(() => resolveTxt(d)),
    safe(() => resolveCname(`brevo1._domainkey.${d}`)),
    safe(() => resolveCname(`brevo2._domainkey.${d}`)),
    safe(() => resolve4(d)),
  ])

  const mxRecords = mx ?? []
  const hasCloudflareRouting = mxRecords.some(r => r.exchange.includes('mx.cloudflare.net'))
  const hasGodaddyMx = mxRecords.some(r => r.exchange.includes('secureserver.net'))
  const hasGoogleMx = mxRecords.some(r => r.exchange.includes('google.com') || r.exchange.includes('googlemail.com'))
  const hasMicrosoftMx = mxRecords.some(r => r.exchange.includes('outlook.com') || r.exchange.includes('protection.outlook.com'))

  const txtRecords = (txt ?? []).map(t => t.join(''))
  const spfRecord = txtRecords.find(t => t.startsWith('v=spf1'))
  const spfRecords = txtRecords.filter(t => t.startsWith('v=spf1'))
  const hasBrevoSpf = spfRecord?.includes('_spf.brevo.com') ?? false
  const hasCloudflareSpf = spfRecord?.includes('_spf.mx.cloudflare.net') ?? false
  const dmarcRecord = (await safe(() => resolveTxt(`_dmarc.${d}`)) ?? []).map(t => t.join('')).find(t => t.startsWith('v=DMARC1'))

  const hasDkim1 = !!dkim1
  const hasDkim2 = !!dkim2

  // Detect A record issues
  const aList = aRecords ?? []
  const hasParkedRecord = aList.some(ip => ip === '50.63.202.45' || ip === '160.153.137.167') // GoDaddy parked IPs
  const hasVercelRecord = aList.some(ip => ip === '76.76.21.21')
  const multipleARecords = aList.length > 1

  // Known parked/placeholder IPs
  const PARKED_IPS = ['50.63.202.45', '160.153.137.167', '184.168.131.241', '208.109.80.2']
  const parkedIps = aList.filter(ip => PARKED_IPS.includes(ip))

  // Known GoDaddy email CNAMEs that should be removed
  const GODADDY_EMAIL_CNAMES = ['email.secureserver.net', 'pop.secureserver.net', 'smtp.secureserver.net', 'imap.secureserver.net', 'mailstore1.secureserver.net']

  // Detect conflicts
  const conflicts: Conflict[] = []

  // Multiple/conflicting MX records
  if (mxRecords.length > 1 && hasCloudflareRouting && (hasGodaddyMx || hasGoogleMx || hasMicrosoftMx)) {
    conflicts.push({
      type: 'Conflicting MX records',
      severity: 'error',
      message: `You have ${mxRecords.length} MX records pointing to different email providers. This causes unpredictable email routing.`,
      fix: 'Delete all MX records except the Cloudflare ones (route1/2/3.mx.cloudflare.net).',
    })
  }

  // Old GoDaddy MX records alongside Cloudflare
  if (hasCloudflareRouting && hasGodaddyMx) {
    conflicts.push({
      type: 'Old GoDaddy email records',
      severity: 'error',
      message: 'GoDaddy email MX records are still present alongside Cloudflare Email Routing.',
      fix: 'Delete MX records pointing to secureserver.net and mailstore1.secureserver.net.',
    })
  }

  // Parked A records
  if (parkedIps.length > 0) {
    conflicts.push({
      type: 'Parked/placeholder A record',
      severity: 'error',
      message: `A parked IP address (${parkedIps.join(', ')}) is conflicting with your real A record. This can break your website and email.`,
      fix: `Delete the A record pointing to ${parkedIps.join(', ')}. Keep only the record pointing to your intended destination.`,
    })
  }

  // Multiple A records
  if (multipleARecords && !hasParkedRecord) {
    conflicts.push({
      type: 'Multiple A records',
      severity: 'warning',
      message: `${aList.length} A records found (${aList.join(', ')}). Multiple A records can cause inconsistent routing.`,
      fix: 'If you only need one destination, remove the extra A records and keep just one.',
    })
  }

  // Multiple SPF records
  if (spfRecords.length > 1) {
    conflicts.push({
      type: 'Multiple SPF records',
      severity: 'error',
      message: `${spfRecords.length} SPF records found. DNS only allows one SPF record — having multiple causes email to fail authentication.`,
      fix: `Merge all your SPF records into one. Example: v=spf1 include:_spf.brevo.com include:_spf.mx.cloudflare.net ~all`,
    })
  }

  // SPF missing Brevo
  if (spfRecord && !hasBrevoSpf) {
    conflicts.push({
      type: 'SPF missing Brevo',
      severity: 'warning',
      message: 'Your SPF record exists but does not include Brevo. Emails sent through easonet may land in spam.',
      fix: `Add include:_spf.brevo.com to your SPF record. Example: v=spf1 include:_spf.brevo.com ~all`,
    })
  }

  let currentProvider = 'Unknown'
  if (hasCloudflareRouting) currentProvider = 'Cloudflare Email Routing'
  else if (hasGodaddyMx) currentProvider = 'GoDaddy Email'
  else if (hasGoogleMx) currentProvider = 'Google Workspace'
  else if (hasMicrosoftMx) currentProvider = 'Microsoft 365'
  else if (mxRecords.length > 0) currentProvider = mxRecords[0].exchange

  const hasErrors = conflicts.some(c => c.severity === 'error')
  const hasWarnings = conflicts.some(c => c.severity === 'warning')

  return res.json({
    domain: d,
    currentProvider,
    aRecords: aList,
    conflicts,
    hasErrors,
    hasWarnings,
    mx: {
      records: mxRecords.sort((a, b) => a.priority - b.priority),
      hasCloudflareRouting,
      status: hasCloudflareRouting ? 'ok' : mxRecords.length === 0 ? 'missing' : 'wrong',
    },
    spf: {
      record: spfRecord ?? null,
      allRecords: spfRecords,
      hasBrevoSpf,
      hasCloudflareSpf,
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
    allGood: hasCloudflareRouting && hasBrevoSpf && hasDkim1 && hasDkim2 && conflicts.filter(c => c.severity === 'error').length === 0,
  })
}
