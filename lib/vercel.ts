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
