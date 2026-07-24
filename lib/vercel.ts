import dns from 'dns'
import { promisify } from 'util'

const resolve4 = promisify(dns.resolve4)
const resolveCname = promisify(dns.resolveCname)

const VERCEL_A_RECORDS = ['76.76.21.21']

// Require the domain's DNS to already point at Vercel before we ever claim it via the
// API. Vercel only allows a domain on one project account-wide, so registering a
// domain the caller doesn't actually control would let them occupy/deny that domain
// slot for its real owner — this check is what stops that.
export async function domainPointsAtVercel(domain: string): Promise<boolean> {
  const [a, cname] = await Promise.all([
    resolve4(domain).catch(() => [] as string[]),
    resolveCname(domain).catch(() => [] as string[]),
  ])
  if (a.some(ip => VERCEL_A_RECORDS.includes(ip))) return true
  if (cname.some(c => /vercel-dns\.com$|\.vercel\.app$/i.test(c))) return true
  return false
}

export async function addDomainToVercel(domain: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (!token || !projectId) {
    console.error('Missing VERCEL_API_TOKEN or VERCEL_PROJECT_ID')
    return { success: false, error: 'Vercel API not configured' }
  }

  try {
    const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    })

    const data = await res.json()

    if (res.ok) return { success: true }

    // Already added is fine
    if (data.error?.code === 'domain_already_in_use' || data.error?.code === 'domain_already_exists') {
      return { success: true }
    }

    console.error('Vercel add domain error:', data)
    return { success: false, error: data.error?.message || 'Failed to add domain to Vercel' }
  } catch (err: any) {
    console.error('Vercel API error:', err.message)
    return { success: false, error: err.message }
  }
}

export async function removeDomainFromVercel(domain: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) return

  try {
    await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
  } catch (err: any) {
    console.error('Vercel remove domain error:', err.message)
  }
}
