import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import BrandPageContent from '../../components/BrandPageContent'

export default function BrandPageView() {
  const router = useRouter()
  const { slug } = router.query
  const [page, setPage] = useState<any>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/brandpages/info?slug=${slug}`).then(r => r.json()).then(data => {
      if (data.error) return
      setPage(data)
    })
  }, [slug])

  if (!page) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 12, color: '#333' }}>
      // loading…
    </div>
  )

  return <BrandPageContent page={page} />
}
