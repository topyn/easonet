import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function DomainRedirect() {
  const router = useRouter()
  const { domain } = router.query
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!domain) return
    fetch(`https://www.easonet.com/api/brandpages/info?domain=${domain}`)
      .then(r => r.json())
      .then(data => {
        if (data.slug) {
          router.replace(`/p/${data.slug}`)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
  }, [domain])

  if (error) return (
    <>
      <Head><title>Page not found</title></Head>
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, color: '#333', gap: 16 }}>
        <div>// domain not connected to an easonet brand page</div>
        <a href="https://easonet.com" style={{ color: '#7B6EF6', fontSize: 11 }}>powered by easonet</a>
      </div>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, color: '#333' }}>
      // loading…
    </div>
  )
}
