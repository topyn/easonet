import { promises as dns } from 'dns'

export interface DnsCheckResult {
  mx: boolean
  spf: boolean
  mxRecord?: string
  spfRecord?: string
  error?: string
}

const REQUIRED_MX = 'route1.mx.cloudflare.net'
const REQUIRED_SPF_INCLUDE = '_spf.brevo.com'

export async function checkDnsRecords(domain: string): Promise<DnsCheckResult> {
  const result: DnsCheckResult = { mx: false, spf: false }

  try {
    // Check MX records
    const mxRecords = await dns.resolveMx(domain).catch(() => [])
    const hasMx = mxRecords.some(r =>
      r.exchange.toLowerCase().includes('cloudflare.net') ||
      r.exchange.toLowerCase().includes('improvmx.com')
    )
    result.mx = hasMx
    result.mxRecord = mxRecords[0]?.exchange

    // Check TXT records for SPF
    const txtRecords = await dns.resolveTxt(domain).catch(() => [] as string[][])
    const spfRecord = txtRecords
      .flat()
      .find(r => r.startsWith('v=spf1'))

    result.spf = !!spfRecord && spfRecord.includes(REQUIRED_SPF_INCLUDE)
    result.spfRecord = spfRecord

  } catch (err) {
    result.error = 'Could not resolve DNS records'
  }

  return result
}

// Generate the exact DNS records a user needs to add for their domain
export function getRequiredDnsRecords(domain: string) {
  return {
    mx: {
      type: 'MX',
      name: domain,
      value: 'route1.mx.cloudflare.net',
      priority: 13,
      note: 'Routes inbound email to easonet',
    },
    spf: {
      type: 'TXT',
      name: domain,
      value: 'v=spf1 include:_spf.brevo.com ~all',
      note: 'Authorises easonet to send email on your behalf',
    },
  }
}
