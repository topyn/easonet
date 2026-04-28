import type { NextApiRequest, NextApiResponse } from 'next'
import dns from 'dns'
import { promisify } from 'util'

const resolveNs = promisify(dns.resolveNs)
const resolveMx = promisify(dns.resolveMx)
const resolveTxt = promisify(dns.resolveTxt)
const resolveCname = promisify(dns.resolveCname)

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

function detectProvider(ns: string[]): string {
  const joined = ns.join(' ').toLowerCase()
  if (joined.includes('cloudflare')) return 'cloudflare'
  if (joined.includes('domaincontrol') || joined.includes('godaddy')) return 'godaddy'
  if (joined.includes('namecheap') || joined.includes('registrar-servers')) return 'namecheap'
  if (joined.includes('squarespace')) return 'squarespace'
  if (joined.includes('google')) return 'google'
  return 'other'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { domain } = req.query
  if (!domain) return res.status(400).json({ error: 'Domain required' })

  const d = String(domain).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim()

  const [nameservers, mx, txt, dkim1, dkim2] = await Promise.all([
    safe(() => resolveNs(d)),
    safe(() => resolveMx(d)),
    safe(() => resolveTxt(d)),
    safe(() => resolveCname(`brevo1._domainkey.${d}`)),
    safe(() => resolveCname(`brevo2._domainkey.${d}`)),
  ])

  const ns = nameservers ?? []
  const provider = detectProvider(ns)
  const txtFlat = (txt ?? []).map((t: string[]) => t.join(''))
  const spfRecord = txtFlat.find((t: string) => t.startsWith('v=spf1'))
  const hasBrevoSpf = spfRecord?.includes('_spf.brevo.com') ?? false
  const hasCloudflareRouting = (mx ?? []).some((r: any) => r.exchange?.includes('mx.cloudflare.net'))

  const steps = {
    mx: (mx ?? []).length > 0 && hasCloudflareRouting,
    spf: hasBrevoSpf,
    dkim: !!dkim1 && !!dkim2,
  }

  return res.json({
    domain: d,
    provider,
    nameservers: ns,
    isOnCloudflare: provider === 'cloudflare',
    steps,
    allDone: steps.mx && steps.spf && steps.dkim,
  })
}
