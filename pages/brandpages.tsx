import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { authFetch, clearTokens } from '../lib/auth-client'

interface BrandPage { id: string; slug: string; title: string; tagline?: string; accentColor: string; bgStyle: string; customDomain?: string; active: boolean; identity?: { name: string; color: string } | null }
interface Store { id: string; name: string; slug: string }
interface Waitlist { id: string; name: string; slug: string }

const BG = '#080808', BG2 = '#101010', BG3 = '#161616'
const BORDER = 'rgba(255,255,255,0.07)', BORDER2 = 'rgba(255,255,255,0.12)'
const TEXT = '#f0f0ee', MUTED = '#666', ACCENT = '#7B6EF6'




const ACCENT_COLORS = ['#7B6EF6','#3ECF8E','#F5A623','#60A5FA','#F87171','#A78BFA','#34D399','#FB923C']

export default function BrandPagesManager() {
  const router = useRouter()
  const [pages, setPages] = useState<BrandPage[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<Store[]>([])
  const [waitlists, setWaitlists] = useState<Waitlist[]>([])
  const [copied, setCopied] = useState('')
  const [saving, setSaving] = useState(false)

  const defaultForm = { slug: '', title: '', tagline: '', description: '', logoUrl: '', accentColor: '#7B6EF6', bgStyle: 'dark', fontStyle: 'modern', customDomain: '', storeId: '', waitlistId: '', links: [] as {label:string;url:string}[], sections: [] as {title:string;content:string}[] }
  const [form, setForm] = useState(defaultForm)
  const [newLink, setNewLink] = useState({ label: '', url: '' })
  const [newSection, setNewSection] = useState({ title: '', content: '' })

  useEffect(() => {
    try { if (!localStorage.getItem('easonet_token')) { router.replace('/login'); return } } catch { router.replace('/login'); return }
    load()
    authFetch('/api/stores').then(r => r.json()).then(d => setStores(Array.isArray(d) ? d : []))
    authFetch('/api/waitlists').then(r => r.json()).then(d => setWaitlists(Array.isArray(d) ? d : []))
  }, [])

  async function load() {
    const data = await authFetch('/api/brandpages').then(r => r.json())
    setPages(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function openPage(p: BrandPage) {
    const data = await authFetch(`/api/brandpages/${p.id}`).then(r => r.json())
    setSelected(data)
    setForm({ ...defaultForm, ...data, links: data.links || [], sections: data.sections || [], storeId: data.storeId || '', waitlistId: data.waitlistId || '', customDomain: data.customDomain || '' })
    setCreating(false)
  }

  async function create() {
    if (!form.title || !form.slug) return
    setSaving(true)
    const res = await authFetch('/api/brandpages', { method: 'POST', body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error || 'Failed'); return }
    setCreating(false)
    setForm(defaultForm)
    load()
    openPage(data)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    await authFetch(`/api/brandpages/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) })
    setSaving(false)
    load()
  }

  async function deletePage() {
    if (!selected || !confirm('Delete this brand page?')) return
    await authFetch(`/api/brandpages/${selected.id}`, { method: 'DELETE' })
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
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <>
      <Head>
        <title>Brand Pages — Easonet</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${BG}; color: ${TEXT}; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; } select option { background: ${BG2}; }`}</style>

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 24, padding: '0 32px', height: 56, background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}` }}>
        <a href="/app" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: -0.5, color: TEXT }}>easonet</a>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333' }}>/</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: ACCENT }}>brand pages</div>
        <div style={{ flex: 1 }} />
        <a href="/app" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>← back to inbox</a>
      </nav>

      <div style={{ paddingTop: 56, minHeight: '100vh', display: 'flex' }}>
        {/* Sidebar */}
        <div style={{ width: 260, borderRight: `1px solid ${BORDER}`, background: BG2, display: 'flex', flexDirection: 'column', position: 'fixed', top: 56, bottom: 0, overflowY: 'auto' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={() => { setCreating(true); setSelected(null); setForm(defaultForm) }} style={{ ...btnStyle, width: '100%', fontSize: 12 }}>+ New brand page</button>
          </div>
          <div style={{ flex: 1, padding: '8px 0' }}>
            {loading ? <div style={{ padding: '20px 16px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// loading…</div>
            : pages.length === 0 ? <div style={{ padding: '20px 16px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// no pages yet</div>
            : pages.map(p => (
              <div key={p.id} onClick={() => openPage(p)}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${BORDER}`, background: selected?.id === p.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.accentColor, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{p.title}</div>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333' }}>/{p.slug}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{ marginLeft: 260, flex: 1, padding: '32px 40px', maxWidth: 760 }}>

          {/* Create form */}
          {creating && (
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.5, marginBottom: 8 }}>New brand page</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', marginBottom: 32 }}>// your page will be live at easonet.com/p/slug</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520 }}>
                <div>
                  <label style={labelStyle}>Brand name</label>
                  <input style={inputStyle} placeholder="Topyn" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))} />
                </div>
                <div>
                  <label style={labelStyle}>URL slug</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', whiteSpace: 'nowrap' }}>easonet.com/p/</span>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Tagline</label>
                  <input style={inputStyle} placeholder="One-line description of your brand" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Accent colour</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ACCENT_COLORS.map(c => (
                      <div key={c} onClick={() => setForm(f => ({ ...f, accentColor: c }))}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.accentColor === c ? `2px solid ${TEXT}` : '2px solid transparent', boxSizing: 'border-box' }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Background</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['dark', 'light'].map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, bgStyle: s }))}
                        style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${form.bgStyle === s ? ACCENT : BORDER}`, background: form.bgStyle === s ? ACCENT + '18' : 'transparent', color: form.bgStyle === s ? ACCENT : MUTED, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={create} disabled={saving || !form.title || !form.slug} style={{ ...btnStyle, opacity: saving ? 0.5 : 1 }}>{saving ? 'Creating…' : 'Create page →'}</button>
                  <button onClick={() => setCreating(false)} style={ghostBtn}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit page */}
          {selected && !creating && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.5, marginBottom: 4 }}>{selected.title}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>easonet.com/p/{selected.slug}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`/p/${selected.slug}`} target="_blank" rel="noreferrer"><button style={ghostBtn}>Preview ↗</button></a>
                  <button onClick={save} disabled={saving} style={btnStyle}>{saving ? 'Saving…' : 'Save changes'}</button>
                  <button onClick={deletePage} style={{ ...ghostBtn, color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.2)' }}>Delete</button>
                </div>
              </div>

              {/* Share */}
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 24px', marginBottom: 28 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>// share</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555', background: BG3, padding: '8px 12px', borderRadius: 6 }}>https://easonet.com/p/{selected.slug}</div>
                  <button onClick={() => copy(`https://easonet.com/p/${selected.slug}`, 'url')} style={{ ...ghostBtn, fontSize: 11, padding: '7px 14px', color: copied === 'url' ? '#3ECF8E' : MUTED }}>{copied === 'url' ? '✓ Copied' : 'Copy'}</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Basic info */}
                <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>// content</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'Brand name', key: 'title', placeholder: 'Topyn' },
                      { label: 'Tagline', key: 'tagline', placeholder: 'One-line brand description' },
                      { label: 'Logo URL', key: 'logoUrl', placeholder: 'https://...' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={labelStyle}>{f.label}</label>
                        <input style={inputStyle} placeholder={f.placeholder} value={(form as any)[f.key] || ''} onChange={e => setForm(pf => ({ ...pf, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label style={labelStyle}>About / Description</label>
                      <textarea style={{ ...inputStyle, resize: 'none', height: 100 }} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell visitors about your brand..." />
                    </div>
                  </div>
                </div>

                {/* Style */}
                <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>// style</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Accent colour</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ACCENT_COLORS.map(c => (
                          <div key={c} onClick={() => setForm(f => ({ ...f, accentColor: c }))}
                            style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: form.accentColor === c ? `2px solid ${TEXT}` : '2px solid transparent', boxSizing: 'border-box' }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Background</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['dark', 'light'].map(s => (
                          <button key={s} onClick={() => setForm(f => ({ ...f, bgStyle: s }))}
                            style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${form.bgStyle === s ? ACCENT : BORDER}`, background: form.bgStyle === s ? ACCENT + '18' : 'transparent', color: form.bgStyle === s ? ACCENT : MUTED, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Font style</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[{v:'modern',l:'Modern (Syne)'},{v:'classic',l:'Classic (Serif)'}].map(s => (
                          <button key={s.v} onClick={() => setForm(f => ({ ...f, fontStyle: s.v }))}
                            style={{ padding: '8px 20px', borderRadius: 7, border: `1px solid ${form.fontStyle === s.v ? ACCENT : BORDER}`, background: form.fontStyle === s.v ? ACCENT + '18' : 'transparent', color: form.fontStyle === s.v ? ACCENT : MUTED, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                            {s.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>// links</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {form.links.map((link, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555', background: BG3, padding: '8px 12px', borderRadius: 6 }}>{link.label} → {link.url}</div>
                        <button onClick={() => setForm(f => ({ ...f, links: f.links.filter((_, j) => j !== i) }))}
                          style={{ padding: '6px 10px', border: `1px solid rgba(255,107,107,0.2)`, borderRadius: 6, background: 'transparent', color: '#ff6b6b', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Label (e.g. Twitter)" value={newLink.label} onChange={e => setNewLink(l => ({ ...l, label: e.target.value }))} />
                    <input style={{ ...inputStyle, flex: 2 }} placeholder="URL" value={newLink.url} onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))} />
                    <button onClick={() => { if (newLink.label && newLink.url) { setForm(f => ({ ...f, links: [...f.links, newLink] })); setNewLink({ label: '', url: '' }) } }} style={{ ...btnStyle, padding: '9px 14px', whiteSpace: 'nowrap' as const }}>+ Add</button>
                  </div>
                </div>

                {/* Connect tools */}
                <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>// connected tools</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Store</label>
                      <select style={selectStyle} value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))}>
                        <option value="">No store</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Waitlist</label>
                      <select style={selectStyle} value={form.waitlistId} onChange={e => setForm(f => ({ ...f, waitlistId: e.target.value }))}>
                        <option value="">No waitlist</option>
                        {waitlists.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Custom sections */}
                <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>// custom sections</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {form.sections.map((section, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555', background: BG3, padding: '8px 12px', borderRadius: 6 }}>{section.title}</div>
                        <button onClick={() => setForm(f => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }))}
                          style={{ padding: '6px 10px', border: `1px solid rgba(255,107,107,0.2)`, borderRadius: 6, background: 'transparent', color: '#ff6b6b', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input style={inputStyle} placeholder="Section title" value={newSection.title} onChange={e => setNewSection(s => ({ ...s, title: e.target.value }))} />
                    <textarea style={{ ...inputStyle, resize: 'none', height: 80 }} placeholder="Section content..." value={newSection.content} onChange={e => setNewSection(s => ({ ...s, content: e.target.value }))} />
                    <button onClick={() => { if (newSection.title && newSection.content) { setForm(f => ({ ...f, sections: [...f.sections, newSection] })); setNewSection({ title: '', content: '' }) } }}
                      style={{ ...btnStyle, alignSelf: 'flex-start' }}>+ Add section</button>
                  </div>
                </div>

                {/* Custom domain */}
                <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>// custom domain</div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Your domain</label>
                    <input style={inputStyle} placeholder="topyn.com" value={form.customDomain} onChange={e => setForm(f => ({ ...f, customDomain: e.target.value }))} />
                  </div>
                  {form.customDomain && (
                    <div style={{ background: BG3, borderRadius: 8, padding: '14px 16px' }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>Add this DNS record</div>
                      <div style={{ display: 'flex', gap: 12, fontFamily: "'DM Mono', monospace", fontSize: 12, marginBottom: 8 }}>
                        <span style={{ color: '#444', minWidth: 60 }}>Type</span><span style={{ color: TEXT }}>CNAME</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontFamily: "'DM Mono', monospace", fontSize: 12, marginBottom: 8 }}>
                        <span style={{ color: '#444', minWidth: 60 }}>Name</span><span style={{ color: TEXT }}>@</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                        <span style={{ color: '#444', minWidth: 60 }}>Value</span><span style={{ color: TEXT }}>www.easonet.com</span>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={save} disabled={saving} style={{ ...btnStyle, alignSelf: 'flex-start' }}>{saving ? 'Saving…' : 'Save all changes →'}</button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!creating && !selected && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 200px)', gap: 16 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1, textAlign: 'center' }}>Your brand, one page</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', textAlign: 'center', maxWidth: 360, lineHeight: 1.8 }}>Create a hosted page for any brand. Links, store, waitlist, contact — all in one place. Point your own domain at it in minutes.</div>
              <button onClick={() => setCreating(true)} style={{ ...btnStyle, marginTop: 8 }}>Create your first page →</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
