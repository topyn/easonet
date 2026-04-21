import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Template1 from '../../components/templates/Template1'
import Template2 from '../../components/templates/Template2'
import Template3 from '../../components/templates/Template3'
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
    <div style={{ minHeight:'100vh',background:'#080808',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:12,color:'#333' }}>
      // loading…
    </div>
  )

  if (page.template === '2') return <Template2 page={page} />
  if (page.template === '3') return <Template3 page={page} />
  if (page.template === '1') return <Template1 page={page} />
  return <BrandPageContent page={page} />
}
