import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { authFetch, clearTokens } from '../lib/auth-client'

interface Waitlist {
  id: string; name: string; slug: string; headline: string
  description?: string; buttonText: string; active: boolean
  _count: { signups: number }
  identity?: { name: string; color: string } | null
}

interface Signup { id: string; email: string; name?: string; createdAt: string }

const BG = '#080808', BG2 = '#101010', BG3 = '#161616'
const BORDER = 'rgba(255,255,255,0.07)', BORDER2 = 'rgba(255,255,255,0.12)'
const TEXT = '#f0f0ee', MUTED = '#666', ACCENT = '#7B6EF6'


function authFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, { ...opts, headers: { ...opts.headers as any, Authorization: `Bearer ${getToken()}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) } })
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function WaitlistsPage() {
  const router = useRouter()
  const [waitlists, setWaitlists] = useState<Waitlist[]>([])
  const [selected, setSelected] = useState<(Waitlist & { signups: Signup[] }) | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', slug: '', headline: 'Get early access', description: '', buttonText: 'Join waitlist', thankYouMsg: "You're on the list! We'll be in touch." })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    try {
      if (!localStorage.getItem('easonet_token')) { router.replace('/login'); return }
    } catch { router.replace('/login'); return }
    load()
  }, [])

  async function load() {
    const data = await authFetch('/api/waitlists').then(r => r.json())
    setWaitlists(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function openWaitlist(w: Waitlist) {
    const data = await authFetch(`/api/waitlists/${w.id}`).then(r => r.json())
    setSelected(data)
  }

  async function create() {
    if (!form.name || !form.slug) return
    setSaving(true)
    const res = await authFetch('/api/waitlists', { method: 'POST', body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error || 'Failed to create'); return }
    setCreating(false)
    setForm({ name: '', slug: '', headline: 'Get early access', description: '', buttonText: 'Join waitlist', thankYouMsg: "You're on the list! We'll be in touch." })
    load()
  }

  async function deleteWaitlist(id: string) {
    if (!confirm('Delete this waitlist and all signups?')) return
    await authFetch(`/api/waitlists/${id}`, { method: 'DELETE' })
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
        <title>Waitlists — Easonet</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${BG}; color: ${TEXT}; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }`}</style>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 24, padding: '0 32px', height: 56, background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}` }}>
        <a href="/app" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: -0.5, color: TEXT }}>easonet</a>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333' }}>/</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: ACCENT }}>waitlists</div>
        <div style={{ flex: 1 }} />
        <a href="/app" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>← back to inbox</a>
      </nav>

      <div style={{ paddingTop: 56, minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Sidebar — waitlist list */}
        <div style={{ width: 280, borderRight: `1px solid ${BORDER}`, background: BG2, display: 'flex', flexDirection: 'column', position: 'fixed', top: 56, bottom: 0, overflowY: 'auto' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={() => { setCreating(true); setSelected(null) }} style={{ ...btnStyle, width: '100%', fontSize: 12 }}>+ New waitlist</button>
          </div>
          <div style={{ flex: 1, padding: '8px 0' }}>
            {loading ? (
              <div style={{ padding: '20px 16px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// loading…</div>
            ) : waitlists.length === 0 ? (
              <div style={{ padding: '20px 16px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// no waitlists yet</div>
            ) : waitlists.map(w => (
              <div
                key={w.id}
                onClick={() => { setSelected(null); openWaitlist(w); setCreating(false) }}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${BORDER}`, background: selected?.id === w.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, marginBottom: 4 }}>{w.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333' }}>/{w.slug}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT }}>{w._count.signups} signups</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{ marginLeft: 280, flex: 1, padding: '32px 40px', maxWidth: 800 }}>

          {/* Create form */}
          {creating && (
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.5, marginBottom: 8 }}>New waitlist</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', marginBottom: 32 }}>// create a waitlist for any of your projects</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520 }}>
                <div>
                  <label style={labelStyle}>Waitlist name (internal)</label>
                  <input style={inputStyle} placeholder="e.g. Topyn beta" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) })) }} />
                </div>
                <div>
                  <label style={labelStyle}>URL slug</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', whiteSpace: 'nowrap' }}>easonet.com/w/</span>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="topyn-beta" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Headline (shown to visitors)</label>
                  <input style={inputStyle} placeholder="Get early access to Topyn" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Description (optional)</label>
                  <textarea style={{ ...inputStyle, resize: 'none', height: 80 }} placeholder="A short description of what you're building..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Button text</label>
                  <input style={inputStyle} value={form.buttonText} onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Thank-you message</label>
                  <input style={inputStyle} value={form.thankYouMsg} onChange={e => setForm(f => ({ ...f, thankYouMsg: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                  <button onClick={create} disabled={saving || !form.name || !form.slug} style={{ ...btnStyle, opacity: saving || !form.name || !form.slug ? 0.5 : 1 }}>
                    {saving ? 'Creating…' : 'Create waitlist →'}
                  </button>
                  <button onClick={() => setCreating(false)} style={ghostBtn}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Waitlist detail */}
          {selected && !creating && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.5, marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// {selected._count.signups} signups</div>
                </div>
                <button onClick={() => deleteWaitlist(selected.id)} style={{ ...ghostBtn, color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.2)', fontSize: 12 }}>Delete</button>
              </div>

              {/* Share links */}
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>// share & embed</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Public page', value: `https://easonet.com/w/${selected.slug}` },
                    { label: 'Embed snippet', value: `<script src="https://easonet.com/w/embed.js" data-slug="${selected.slug}"></script>` },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#555', background: BG3, padding: '8px 12px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
                        <button onClick={() => copy(item.value, item.label)} style={{ ...ghostBtn, fontSize: 11, whiteSpace: 'nowrap', padding: '7px 14px', color: copied === item.label ? '#3ECF8E' : MUTED, borderColor: copied === item.label ? 'rgba(62,207,142,0.3)' : BORDER }}>
                          {copied === item.label ? '✓ Copied' : 'Copy'}
                        </button>
                        {item.label === 'Public page' && (
                          <a href={`/w/${selected.slug}`} target="_blank" rel="noreferrer">
                            <button style={{ ...ghostBtn, fontSize: 11, padding: '7px 14px' }}>Open ↗</button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signups */}
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em' }}>// signups ({selected.signups.length})</div>
                  {selected.signups.length > 0 && (
                    <button onClick={() => {
                      const csv = 'name,email,date\n' + selected.signups.map(s => `${s.name || ''},${s.email},${new Date(s.createdAt).toLocaleDateString()}`).join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href = url; a.download = `${selected.slug}-signups.csv`; a.click()
                    }} style={{ ...ghostBtn, fontSize: 11, padding: '5px 12px' }}>Export CSV</button>
                  )}
                </div>
                {selected.signups.length === 0 ? (
                  <div style={{ padding: '32px 24px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', textAlign: 'center' }}>
                    // no signups yet — share your waitlist page to get started
                  </div>
                ) : (
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {selected.signups.map((s, i) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', borderBottom: i < selected.signups.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT + '18', color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                          {(s.name || s.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {s.name && <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{s.name}</div>}
                          <div style={{ fontSize: 13, color: s.name ? MUTED : TEXT }}>{s.email}</div>
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', whiteSpace: 'nowrap' }}>{new Date(s.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!creating && !selected && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 200px)', gap: 16 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1, textAlign: 'center' }}>Capture interest before you launch</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333', textAlign: 'center', maxWidth: 360, lineHeight: 1.8 }}>Create a waitlist for any project. Get a shareable link and an embed code. All signups in one place.</div>
              <button onClick={() => setCreating(true)} style={{ ...btnStyle, marginTop: 8 }}>Create your first waitlist →</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
