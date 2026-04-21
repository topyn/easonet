import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function DomainRedirect() {
  const router = useRouter()
  const { domain } = router.query

  useEffect(() => {
    if (!domain) return
    // Find the brand page for this domain and redirect to it
    fetch(`/api/brandpages/info?domain=${domain}`)
      .then(r => r.json())
      .then(data => {
        if (data.slug) router.replace(`/p/${data.slug}`)
      })
  }, [domain])

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, color: '#333' }}>
      // loading…
    </div>
  )
}
