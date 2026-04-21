import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Template1 from '../../components/templates/Template1'
import Template2 from '../../components/templates/Template2'
import Template3 from '../../components/templates/Template3'
import BrandPageContent from '../../components/BrandPageContent'

export default function DomainPage() {
  const router = useRouter()
  const { domain } = router.query
  const [page, setPage] = useState<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!domain) return
    fetch(`https://www.easonet.com/api/brandpages/info?domain=${domain}`)
      .then(r => r.json())
      .then(data => { if (data.id) setPage(data); else setError(true) })
      .catch(() => setError(true))
  }, [domain])

  if (error) return (
    <>
      <Head><title>Page not found</title></Head>
      <div style={{ minHeight:'100vh',background:'#080808',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:12,color:'#333',gap:16 }}>
        <div>// domain not connected to an easonet brand page</div>
        <a href="https://easonet.com" style={{ color:'#7B6EF6',fontSize:11 }}>powered by easonet</a>
      </div>
    </>
  )

  if (!page) return (
    <div style={{ minHeight:'100vh',background:'#080808',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:12,color:'#333' }}>
      // loading…
    </div>
  )

  if (page.template === '2') return <Template2 page={page} />
  if (page.template === '3') return <Template3 page={page} />
  if (page.template === '1') return <Template1 page={page} />
  return <BrandPageContent page={page} />
}
