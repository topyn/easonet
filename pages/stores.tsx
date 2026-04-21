import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

interface Store { id: string; name: string; slug: string; description?: string; active: boolean; _count: { products: number; orders: number }; identity?: { name: string; color: string } | null }
interface Product { id: string; name: string; description?: string; price: number; currency: string; type: string; imageUrl?: string; fileUrl?: string; deliveryNote?: string; stock?: number; active: boolean }
interface Order { id: string; buyerName: string; buyerEmail: string; buyerAddress?: string; quantity: number; total: number; currency: string; status: string; createdAt: string; product: { name: string } }
interface StoreDetail extends Store { products: Product[]; orders: Order[]; identity?: { name: string; color: string; email: string } | null }

const BG = '#080808', BG2 = '#101010', BG3 = '#161616'
const BORDER = 'rgba(255,255,255,0.07)', BORDER2 = 'rgba(255,255,255,0.12)'
const TEXT = '#f0f0ee', MUTED = '#666', ACCENT = '#7B6EF6'

function getToken() { try { return localStorage.getItem('easonet_token') ?? '' } catch { return '' } }
function authFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, { ...opts, headers: { ...(opts.headers as any), Authorization: `Bearer ${getToken()}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) } })
}
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

const STATUS_COLORS: Record<string, string> = { pending: '#F5A623', paid: '#3ECF8E', fulfilled: '#7B6EF6', cancelled: '#ff6b6b' }

export default function StoresPage() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [selected, setSelected] = useState<StoreDetail | null>(null)
  const [creating, setCreating] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [tab, setTab] = useState<'products' | 'orders'>('products')

  const [storeForm, setStoreForm] = useState({ name: '', slug: '', description: '' })
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', type: 'digital', imageUrl: '', fileUrl: '', deliveryNote: '', stock: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try { if (!localStorage.getItem('easonet_token')) { router.replace('/login'); return } } catch { router.replace('/login'); return }
    load()
  }, [])

  async function load() {
    const data = await authFetch('/api/stores').then(r => r.json())
    setStores(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function openStore(s: Store) {
    const data = await authFetch(`/api/stores/${s.id}`).then(r => r.json())
    setSelected(data)
    setTab('products')
  }

  async function createStore() {
    if (!storeForm.name || !storeForm.slug) return
    setSaving(true)
    const res = await authFetch('/api/stores', { method: 'POST', body: JSON.stringify(storeForm) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error || 'Failed'); return }
    setCreating(false)
    setStoreForm({ name: '', slug: '', description: '' })
    load()
  }

  async function addProduct() {
    if (!selected || !productForm.name || !productForm.price) return
    setSaving(true)
    const res = await authFetch(`/api/stores/${selected.id}`, {
      method: 'POST',
      body: JSON.stringify({ ...productForm, price: parseFloat(productForm.price), stock: productForm.stock ? parseInt(productForm.stock) : undefined }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error || 'Failed'); return }
    setAddingProduct(false)
    setProductForm({ name: '', description: '', price: '', type: 'digital', imageUrl: '', fileUrl: '', deliveryNote: '', stock: '' })
    openStore(selected)
  }

  async function deleteStore(id: string) {
    if (!confirm('Delete this store and all its products?')) return
    await authFetch(`/api/stores/${id}`, { method: 'DELETE' })
    setSelected(null)
    load()
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: TEXT, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }
  const btnStyle: React.CSSProperties = { padding: '9px 20px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }
  const ghostBtn: React.CSSProperties = { padding: '9px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: MUTED, fontFamily: "'DM Sans', sans-serif" }

  return (
    <>
      <Head>
        <title>Stores — Easonet</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${BG}; color: ${TEXT}; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }`}</style>

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 24, padding: '0 32px', height: 56, background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}` }}>
        <a href="/app" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: -0.5, color: TEXT }}>easonet</a>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333' }}>/</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: ACCENT }}>stores</div>
        <div style={{ flex: 1 }} />
        <a href="/app" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>← back to inbox</a>
      </nav>

      <div style={{ paddingTop: 56, minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
        {/* Sidebar */}
        <div style={{ width: 280, borderRight: `1px solid ${BORDER}`, background: BG2, display: 'flex', flexDirection: 'column', position: 'fixed', top: 56, bottom: 0, overflowY: 'auto' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={() => { setCreating(true); setSelected(null) }} style={{ ...btnStyle, width: '100%', fontSize: 12 }}>+ New store</button>
          </div>
          <div style={{ flex: 1, padding: '8px 0' }}>
            {loading ? (
              <div style={{ padding: '20px 16px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// loading…</div>
            ) : stores.length === 0 ? (
              <div style={{ padding: '20px 16px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// no stores yet</div>
            ) : stores.map(s => (
              <div key={s.id} onClick={() => { setSelected(null); openStore(s); setCreating(false) }}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${BORDER}`, background: selected?.id === s.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 4 }}>{s.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333' }}>/{s.slug}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT }}>{s._count?.products ?? 0} products · {s._count?.orders ?? 0} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{ marginLeft: 280, flex: 1, padding: '32px 40px', maxWidth: 900 }}>

          {/* Create store form */}
          {creating && (
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.5, marginBottom: 8 }}>New store</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', marginBottom: 32 }}>// create a store for any of your brands</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520 }}>
                <div>
                  <label style={labelStyle}>Store name</label>
                  <input style={inputStyle} placeholder="e.g. Topyn Shop" value={storeForm.name} onChange={e => setStoreForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} />
                </div>
                <div>
                  <label style={labelStyle}>URL slug</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', whiteSpace: 'nowrap' }}>easonet.com/store/</span>
                    <input style={{ ...inputStyle, flex: 1 }} value={storeForm.slug} onChange={e => setStoreForm(f => ({ ...f, slug: slugify(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Description (optional)</label>
                  <textarea style={{ ...inputStyle, resize: 'none', height: 80 }} value={storeForm.description} onChange={e => setStoreForm(f => ({ ...f, description: e.target.value }))} placeholder="What do you sell?" />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={createStore} disabled={saving || !storeForm.name || !storeForm.slug} style={{ ...btnStyle, opacity: saving ? 0.5 : 1 }}>{saving ? 'Creating…' : 'Create store →'}</button>
                  <button onClick={() => setCreating(false)} style={ghostBtn}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Store detail */}
          {selected && !creating && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.5, marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// {selected._count.products} products · {selected._count.orders} orders</div>
                </div>
                <button onClick={() => deleteStore(selected.id)} style={{ ...ghostBtn, color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.2)', fontSize: 12 }}>Delete</button>
              </div>

              {/* Embed code */}
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>// embed on your website</div>
                {[
                  { label: 'Store page', value: `https://easonet.com/store/${selected.slug}` },
                  { label: 'Embed code', value: `<div id="easonet-store"></div>\n<script src="https://easonet.com/store/embed.js" data-store="${selected.slug}"></script>` },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#555', background: BG3, padding: '8px 12px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value.split('\n')[0]}</div>
                      <button onClick={() => copy(item.value, item.label)} style={{ ...ghostBtn, fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap', color: copied === item.label ? '#3ECF8E' : MUTED }}>
                        {copied === item.label ? '✓ Copied' : 'Copy'}
                      </button>
                      {item.label === 'Store page' && <a href={`/store/${selected.slug}`} target="_blank" rel="noreferrer"><button style={{ ...ghostBtn, fontSize: 11, padding: '6px 12px' }}>Open ↗</button></a>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 20 }}>
                {(['products', 'orders'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, background: tab === t ? ACCENT : 'transparent', color: tab === t ? '#fff' : MUTED }}>
                    {t} ({t === 'products' ? selected.products.length : selected.orders.length})
                  </button>
                ))}
              </div>

              {/* Products tab */}
              {tab === 'products' && (
                <div>
                  <button onClick={() => setAddingProduct(true)} style={{ ...btnStyle, fontSize: 12, marginBottom: 16 }}>+ Add product</button>
                  {selected.products.length === 0 ? (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', padding: '24px 0' }}>// no products yet</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                      {selected.products.map(p => (
                        <div key={p.id} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                          {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />}
                          <div style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 4 }}>{p.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: -0.5 }}>${p.price.toFixed(2)}</div>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: p.type === 'digital' ? ACCENT : '#F5A623' }}>{p.type}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Orders tab */}
              {tab === 'orders' && (
                <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                  {selected.orders.length === 0 ? (
                    <div style={{ padding: '32px 24px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', textAlign: 'center' }}>// no orders yet</div>
                  ) : selected.orders.map((o, i) => (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: i < selected.orders.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 2 }}>{o.buyerName}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: MUTED }}>{o.product.name} · ${o.total.toFixed(2)}</div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: STATUS_COLORS[o.status] ?? MUTED, background: (STATUS_COLORS[o.status] ?? MUTED) + '18', border: `1px solid ${(STATUS_COLORS[o.status] ?? MUTED)}30`, padding: '2px 10px', borderRadius: 100 }}>{o.status}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!creating && !selected && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 200px)', gap: 16 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1, textAlign: 'center' }}>Sell anything, from any brand</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', textAlign: 'center', maxWidth: 360, lineHeight: 1.8 }}>Create a store, add products, embed it anywhere. Digital downloads and physical products. PayPal checkout included.</div>
              <button onClick={() => setCreating(true)} style={{ ...btnStyle, marginTop: 8 }}>Create your first store →</button>
            </div>
          )}
        </div>
      </div>

      {/* Add product modal */}
      {addingProduct && selected && (
        <div onClick={e => e.target === e.currentTarget && setAddingProduct(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
          <div style={{ background: BG2, border: `1px solid ${BORDER2}`, borderRadius: 14, padding: 32, width: 480, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>Add product</div>
            {[
              { label: 'Product name', key: 'name', placeholder: 'e.g. Business Plan Template' },
              { label: 'Description', key: 'description', placeholder: 'What does this include?' },
              { label: 'Price (USD)', key: 'price', placeholder: '29.99', type: 'number' },
              { label: 'Image URL (optional)', key: 'imageUrl', placeholder: 'https://...' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input style={inputStyle} type={f.type || 'text'} placeholder={f.placeholder} value={(productForm as any)[f.key]} onChange={e => setProductForm(pf => ({ ...pf, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Product type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['digital', 'physical'].map(t => (
                  <button key={t} onClick={() => setProductForm(pf => ({ ...pf, type: t }))} style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${productForm.type === t ? ACCENT : BORDER}`, background: productForm.type === t ? ACCENT + '18' : 'transparent', color: productForm.type === t ? ACCENT : MUTED, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {productForm.type === 'digital' && (
              <>
                <div>
                  <label style={labelStyle}>Download URL (optional)</label>
                  <input style={inputStyle} placeholder="https://..." value={productForm.fileUrl} onChange={e => setProductForm(pf => ({ ...pf, fileUrl: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Delivery note (shown after purchase)</label>
                  <textarea style={{ ...inputStyle, resize: 'none', height: 70 }} placeholder="e.g. Check your email for download instructions" value={productForm.deliveryNote} onChange={e => setProductForm(pf => ({ ...pf, deliveryNote: e.target.value }))} />
                </div>
              </>
            )}
            {productForm.type === 'physical' && (
              <div>
                <label style={labelStyle}>Stock quantity (optional)</label>
                <input style={inputStyle} type="number" placeholder="Leave blank for unlimited" value={productForm.stock} onChange={e => setProductForm(pf => ({ ...pf, stock: e.target.value }))} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button onClick={addProduct} disabled={saving || !productForm.name || !productForm.price} style={{ ...btnStyle, opacity: saving ? 0.5 : 1 }}>{saving ? 'Adding…' : 'Add product →'}</button>
              <button onClick={() => setAddingProduct(false)} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
