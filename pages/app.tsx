import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'

interface User { id: string; email: string; plan: string; trialEndsAt: string | null }
interface Identity { id: string; name: string; email: string; domain: string; color: string; dnsVerified: boolean }
interface Message { id: string; direction: string; fromAddress: string; toAddress: string; bodyText: string; bodyHtml?: string; createdAt: string }
interface Thread { id: string; subject: string; lastAt: string; read: boolean; participants: string[]; identity: Identity; messages: Message[] }
interface DnsResult { mx: boolean; spf: boolean }

const COLORS = ['#534AB7','#0F6E56','#993C1D','#185FA5','#854F0B','#993556','#3B6D11']

function getToken() {
  try { return localStorage.getItem('easonet_token') ?? '' } catch { return '' }
}

function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken()
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
}

function api(url: string) { return authFetch(url).then(r => r.json()) }
function post(url: string, body: object) { return authFetch(url, { method: 'POST', body: JSON.stringify(body) }) }

function DnsWizard({ identity, onVerified }: { identity: Identity; onVerified: () => void }) {
  const [step, setStep] = useState<'records' | 'checking' | 'done'>('records')
  const [dns, setDns] = useState<DnsResult | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startChecking = useCallback(() => {
    setStep('checking')
    pollRef.current = setInterval(async () => {
      const res = await post('/api/identities/dns-check', { domain: identity.domain })
      const data: DnsResult = await res.json()
      setDns(data)
      if (data.mx && data.spf) {
        clearInterval(pollRef.current!)
        setStep('done')
        setTimeout(onVerified, 1500)
      }
    }, 4000)
  }, [identity.domain, onVerified])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const copy = (text: string) => navigator.clipboard.writeText(text)

  const s: Record<string, any> = {
    wrap: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'system-ui,sans-serif' },
    heading: { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
    sub: { fontSize: 13, color: '#666', lineHeight: 1.5 },
    record: { background: '#f5f5f3', borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 },
    recordLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' },
    copyRow: { display: 'flex', alignItems: 'center', gap: 8 },
    copyVal: { flex: 1, color: '#1a1a1a', wordBreak: 'break-all' },
    copyBtn: { fontSize: 11, padding: '3px 8px', border: '0.5px solid #ccc', borderRadius: 5, cursor: 'pointer', background: '#fff', whiteSpace: 'nowrap' },
    checkRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
    tick: (ok: boolean | null) => ({ width: 18, height: 18, borderRadius: '50%', background: ok === null ? '#e0ddd6' : ok ? '#E1F5EE' : '#FCEBEB', color: ok ? '#0F6E56' : '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }),
    btn: { padding: '10px 20px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' },
    successBox: { background: '#E1F5EE', color: '#0F6E56', padding: '14px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500 },
  }

  if (step === 'done') return <div style={s.wrap}><div style={s.successBox}>DNS verified — {identity.email} is ready to use</div></div>

  return (
    <div style={s.wrap}>
      <div style={s.heading}>Set up {identity.domain}</div>
      <div style={s.sub}>Add these two records in your DNS provider, then click Check.</div>
      <div style={s.record}>
        <div style={s.recordLabel}>MX record</div>
        <div style={{ ...s.recordLabel, marginTop: 4 }}>Name</div>
        <div style={s.copyRow}><span style={s.copyVal}>{identity.domain}</span><button style={s.copyBtn} onClick={() => copy(identity.domain)}>Copy</button></div>
        <div style={{ ...s.recordLabel, marginTop: 4 }}>Value</div>
        <div style={s.copyRow}><span style={s.copyVal}>route1.mx.cloudflare.net</span><button style={s.copyBtn} onClick={() => copy('route1.mx.cloudflare.net')}>Copy</button></div>
        <div style={{ ...s.recordLabel, marginTop: 4 }}>Priority: 13</div>
      </div>
      <div style={s.record}>
        <div style={s.recordLabel}>TXT record (SPF)</div>
        <div style={{ ...s.recordLabel, marginTop: 4 }}>Name</div>
        <div style={s.copyRow}><span style={s.copyVal}>{identity.domain}</span><button style={s.copyBtn} onClick={() => copy(identity.domain)}>Copy</button></div>
        <div style={{ ...s.recordLabel, marginTop: 4 }}>Value</div>
        <div style={s.copyRow}><span style={s.copyVal}>v=spf1 include:_spf.brevo.com ~all</span><button style={s.copyBtn} onClick={() => copy('v=spf1 include:_spf.brevo.com ~all')}>Copy</button></div>
      </div>
      {step === 'checking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={s.checkRow}><div style={s.tick(dns?.mx ?? null)}>{dns?.mx ? '✓' : dns ? '✗' : '…'}</div><span>MX record {dns?.mx ? 'found' : 'checking…'}</span></div>
          <div style={s.checkRow}><div style={s.tick(dns?.spf ?? null)}>{dns?.spf ? '✓' : dns ? '✗' : '…'}</div><span>SPF record {dns?.spf ? 'found' : 'checking…'}</span></div>
          <div style={{ fontSize: 12, color: '#aaa' }}>Checking every 4 seconds</div>
        </div>
      )}
      <button style={s.btn} onClick={startChecking} disabled={step === 'checking'}>
        {step === 'checking' ? 'Checking…' : "I've added the records — check now"}
      </button>
    </div>
  )
}

function UpgradeBanner({ plan, trialEndsAt, identityCount }: { plan: string; trialEndsAt: string | null; identityCount: number }) {
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)) : 0
  const expired = daysLeft === 0 && plan === 'trial'
  const atLimit = plan === 'trial' && identityCount >= 3

  async function upgrade(p: string) {
    const res = await post('/api/billing/checkout', { plan: p })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  if (plan !== 'trial') return null

  const s: Record<string, any> = {
    banner: { background: expired ? '#FCEBEB' : '#EEEDFE', borderBottom: `0.5px solid ${expired ? '#F09595' : '#AFA9EC'}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 },
    text: { flex: 1, color: expired ? '#A32D2D' : '#3C3489' },
    btn: (color: string) => ({ padding: '5px 14px', background: color, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }),
  }

  return (
    <div style={s.banner}>
      <span style={s.text}>
        {expired ? 'Trial expired — upgrade to keep sending' : atLimit ? `Trial: ${daysLeft}d left — at 3-domain limit` : `Trial: ${daysLeft} days left · ${3 - identityCount} domain${3 - identityCount !== 1 ? 's' : ''} remaining`}
      </span>
      <button style={s.btn('#534AB7')} onClick={() => upgrade('starter')}>Starter $9.99</button>
      <button style={s.btn('#0F6E56')} onClick={() => upgrade('growth')}>Growth $19.99</button>
      <button style={s.btn('#185FA5')} onClick={() => upgrade('pro')}>Pro $34.99</button>
    </div>
  )
}

export default function App() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [identities, setIdentities] = useState<Identity[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeIdentityId, setActiveIdentityId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [wizardIdentity, setWizardIdentity] = useState<Identity | null>(null)
  const [composing, setComposing] = useState(false)
  const [addingIdentity, setAddingIdentity] = useState(false)
  const [composeIdentityId, setComposeIdentityId] = useState('')
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeText, setComposeText] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])

  useEffect(() => {
    try {
      const token = localStorage.getItem('easonet_token')
      const userStr = localStorage.getItem('easonet_user')
      if (!token || !userStr) { router.replace('/'); return }
      const savedUser = JSON.parse(userStr)
      setUser(savedUser)
      setLoading(false)
    } catch {
      router.replace('/')
    }
  }, [])

  const loadIdentities = useCallback(async () => {
    const data = await api('/api/identities')
    const list: Identity[] = Array.isArray(data) ? data : []
    setIdentities(list)
    if (list.length > 0 && !composeIdentityId) setComposeIdentityId(list[0].id)
    return list
  }, [composeIdentityId])

  const loadThreads = useCallback(async () => {
    const url = activeIdentityId ? `/api/emails/threads?identityId=${activeIdentityId}` : '/api/emails/threads'
    const data = await api(url)
    setThreads(Array.isArray(data) ? data : [])
  }, [activeIdentityId])

  useEffect(() => { if (!loading) { loadIdentities(); loadThreads() } }, [loading])

  async function openThread(t: Thread) {
    const data = await api(`/api/emails/thread/${t.id}`)
    setActiveThread(data.id ? data : { ...t, messages: t.messages ?? [] })
  }

  async function sendEmail() {
    if (!composeTo || !composeSubject || !composeText || !composeIdentityId) return
    setComposeSending(true)
    await post('/api/emails/send', { identityId: composeIdentityId, to: composeTo, subject: composeSubject, text: composeText })
    setComposeSending(false)
    setComposing(false)
    setComposeTo(''); setComposeSubject(''); setComposeText('')
    loadThreads()
  }

  async function addIdentity() {
    if (!newName || !newEmail) return
    const res = await post('/api/identities', { name: newName, email: newEmail, color: newColor })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Failed to add identity'); return }
    setAddingIdentity(false)
    setNewName(''); setNewEmail('')
    const list = await loadIdentities()
    const created = list.find(i => i.email === newEmail)
    if (created) setWizardIdentity(created)
  }

  async function logout() {
    localStorage.removeItem('easonet_token')
    localStorage.removeItem('easonet_user')
    router.replace('/')
  }

  if (loading) return <div style={{ fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' }}>Loading…</div>

  const s: Record<string, any> = {
    app: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui,sans-serif', background: '#fff', color: '#1a1a1a', overflow: 'hidden' },
    body: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: { width: 220, background: '#f8f7f4', borderRight: '0.5px solid #e0ddd6', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
    sidebarScroll: { flex: 1, overflowY: 'auto', padding: '12px 0' },
    sidebarSection: { padding: '0 12px', marginBottom: 16 },
    sidebarLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, padding: '0 4px' },
    identityRow: (active: boolean, color: string) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, cursor: 'pointer', background: active ? color + '18' : 'transparent', marginBottom: 2 }),
    dot: (color: string) => ({ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }),
    iName: { fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1a1a1a' },
    iEmail: { fontSize: 11, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    unverifiedDot: { width: 6, height: 6, borderRadius: '50%', background: '#EF9F27', marginLeft: 'auto', flexShrink: 0 },
    sidebarBottom: { padding: '12px', borderTop: '0.5px solid #e0ddd6' },
    addBtn: { width: '100%', textAlign: 'left', padding: '7px 8px', fontSize: 12, color: '#888', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8 },
    userRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888' },
    logoutBtn: { marginLeft: 'auto', fontSize: 11, color: '#aaa', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
    toolbar: { display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '0.5px solid #e0ddd6', gap: 10, flexShrink: 0 },
    toolbarTitle: { flex: 1, fontSize: 15, fontWeight: 600 },
    composeBtn: { padding: '7px 18px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    refreshBtn: { padding: '7px 12px', border: '0.5px solid #e0ddd6', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'transparent', color: '#666' },
    threadList: { flex: 1, overflowY: 'auto' },
    thread: (unread: boolean) => ({ display: 'flex', gap: 12, padding: '13px 20px', borderBottom: '0.5px solid #f0ede6', cursor: 'pointer', background: unread ? '#faf9f7' : 'transparent', alignItems: 'flex-start' }),
    avatar: (color: string) => ({ width: 36, height: 36, borderRadius: '50%', background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }),
    threadBody: { flex: 1, minWidth: 0 },
    threadRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    threadFrom: (unread: boolean) => ({ fontSize: 13, fontWeight: unread ? 600 : 400, color: '#1a1a1a' }),
    threadTime: { fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' },
    threadSubject: (unread: boolean) => ({ fontSize: 13, fontWeight: unread ? 500 : 400, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
    threadPreview: { fontSize: 12, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 },
    pill: (color: string) => ({ display: 'inline-block', fontSize: 10, padding: '1px 7px', borderRadius: 10, background: color + '18', color, marginLeft: 6 }),
    empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 14, flexDirection: 'column', gap: 8 },
    threadDetail: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    detailHeader: { padding: '14px 20px', borderBottom: '0.5px solid #e0ddd6', display: 'flex', alignItems: 'center', gap: 10 },
    backBtn: { fontSize: 13, color: '#534AB7', border: 'none', background: 'none', cursor: 'pointer', padding: 0 },
    detailSubject: { fontSize: 15, fontWeight: 600, flex: 1 },
    messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 },
    msgWrap: (out: boolean) => ({ display: 'flex', flexDirection: 'column', alignItems: out ? 'flex-end' : 'flex-start' }),
    msgMeta: { fontSize: 11, color: '#bbb', marginBottom: 4 },
    msgBubble: (out: boolean) => ({ maxWidth: '72%', background: out ? '#534AB7' : '#f5f5f3', color: out ? '#fff' : '#1a1a1a', padding: '10px 14px', borderRadius: out ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }),
    composePanel: { position: 'absolute', bottom: 0, right: 0, width: 480, background: '#fff', border: '0.5px solid #ccc', borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 20px rgba(0,0,0,.08)', zIndex: 10 },
    composeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '0.5px solid #e0ddd6', background: '#f8f7f4', borderRadius: '12px 12px 0 0' },
    composeTitle: { fontSize: 13, fontWeight: 600 },
    composeClose: { fontSize: 16, color: '#999', border: 'none', background: 'none', cursor: 'pointer' },
    composeField: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderBottom: '0.5px solid #f0ede6' },
    fieldLabel: { fontSize: 12, color: '#aaa', width: 36, flexShrink: 0 },
    fieldInput: { flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: '#1a1a1a' },
    fromSelect: { flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', cursor: 'pointer', color: '#1a1a1a' },
    composeBody: { padding: '12px 16px', flex: 1 },
    bodyInput: { width: '100%', border: 'none', outline: 'none', fontSize: 13, resize: 'none', minHeight: 120, background: 'transparent', color: '#1a1a1a', fontFamily: 'system-ui,sans-serif' },
    composeFoot: { display: 'flex', gap: 8, padding: '10px 16px', borderTop: '0.5px solid #e0ddd6' },
    sendBtn: { padding: '7px 18px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    discardBtn: { padding: '7px 14px', border: '0.5px solid #e0ddd6', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'transparent' },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 },
    modalBox: { background: '#fff', borderRadius: 14, padding: 28, width: 400, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '90vh', overflowY: 'auto' },
    modalTitle: { fontSize: 16, fontWeight: 600 },
    input: { border: '0.5px solid #d0cdc6', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
    colorRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    colorSwatch: (color: string, selected: boolean) => ({ width: 26, height: 26, borderRadius: '50%', background: color, cursor: 'pointer', border: selected ? '2px solid #1a1a1a' : '2px solid transparent', boxSizing: 'border-box' }),
    modalBtn: { padding: '9px 20px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    cancelBtn: { padding: '9px 16px', border: '0.5px solid #e0ddd6', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'transparent' },
  }

  const visibleThreads = activeIdentityId ? threads.filter(t => t.identity?.id === activeIdentityId) : threads
  const unreadCount = threads.filter(t => !t.read).length

  return (
    <div style={s.app}>
      {user && <UpgradeBanner plan={user.plan} trialEndsAt={user.trialEndsAt} identityCount={identities.length} />}
      <div style={s.body}>
        <div style={s.sidebar}>
          <div style={s.sidebarScroll}>
            <div style={s.sidebarSection}>
              <div style={s.sidebarLabel}>Identities</div>
              <div style={s.identityRow(!activeIdentityId, '#888')} onClick={() => { setActiveIdentityId(null); setActiveThread(null) }}>
                <div style={s.dot('#888')} />
                <div style={{ minWidth: 0 }}>
                  <div style={s.iName}>All inboxes</div>
                  {unreadCount > 0 && <div style={s.iEmail}>{unreadCount} unread</div>}
                </div>
              </div>
              {identities.map(id => (
                <div key={id.id} style={s.identityRow(activeIdentityId === id.id, id.color)} onClick={() => { setActiveIdentityId(id.id); setActiveThread(null) }}>
                  <div style={s.dot(id.color)} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={s.iName}>{id.name}</div>
                    <div style={s.iEmail}>{id.email}</div>
                  </div>
                  {!id.dnsVerified && <div title="DNS not verified" style={s.unverifiedDot} onClick={e => { e.stopPropagation(); setWizardIdentity(id) }} />}
                </div>
              ))}
              <button style={s.addBtn} onClick={() => setAddingIdentity(true)}>+ Add identity</button>
            </div>
          </div>
          <div style={s.sidebarBottom}>
            <div style={s.userRow}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
              <button style={s.logoutBtn} onClick={logout}>Sign out</button>
            </div>
          </div>
        </div>

        <div style={s.main}>
          {wizardIdentity && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={s.toolbar}>
                <button style={s.backBtn} onClick={() => setWizardIdentity(null)}>← Back</button>
                <span style={s.toolbarTitle}>Set up {wizardIdentity.domain}</span>
              </div>
              <DnsWizard identity={wizardIdentity} onVerified={async () => { setWizardIdentity(null); await loadIdentities() }} />
            </div>
          )}

          {!wizardIdentity && (
            <>
              <div style={s.toolbar}>
                <span style={s.toolbarTitle}>{activeIdentityId ? identities.find(i => i.id === activeIdentityId)?.name ?? 'Inbox' : 'All inboxes'}</span>
                <button style={s.refreshBtn} onClick={loadThreads} title="Refresh">↻</button>
                <button style={s.composeBtn} onClick={() => setComposing(true)}>Compose</button>
              </div>

              {activeThread ? (
                <div style={s.threadDetail}>
                  <div style={s.detailHeader}>
                    <button style={s.backBtn} onClick={() => setActiveThread(null)}>← Back</button>
                    <span style={s.detailSubject}>{activeThread.subject}</span>
                    <span style={s.pill(activeThread.identity?.color ?? '#888')}>{activeThread.identity?.name}</span>
                  </div>
                  <div style={s.messages}>
                    {(activeThread.messages ?? []).map(m => (
                      <div key={m.id} style={s.msgWrap(m.direction === 'outbound')}>
                        <div style={s.msgMeta}>{m.direction === 'outbound' ? `You (${m.fromAddress})` : m.fromAddress} · {new Date(m.createdAt).toLocaleString()}</div>
                        <div style={s.msgBubble(m.direction === 'outbound')}>{m.bodyText}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px 20px', borderTop: '0.5px solid #e0ddd6', display: 'flex', gap: 8 }}>
                    <textarea style={{ flex: 1, border: '0.5px solid #e0ddd6', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', height: 60, fontFamily: 'system-ui' }} placeholder="Quick reply…" id="quick-reply" />
                    <button style={s.sendBtn} onClick={async () => {
                      const el = document.getElementById('quick-reply') as HTMLTextAreaElement
                      if (!el?.value) return
                      await post('/api/emails/send', {
                        identityId: activeThread.identity.id,
                        to: activeThread.participants.find(p => p !== activeThread.identity.email) ?? activeThread.participants[0],
                        subject: `Re: ${activeThread.subject}`,
                        text: el.value,
                        threadId: activeThread.id,
                      })
                      el.value = ''
                      openThread(activeThread)
                    }}>Send</button>
                  </div>
                </div>
              ) : (
                <div style={s.threadList}>
                  {visibleThreads.length === 0 ? (
                    <div style={s.empty}>
                      <span>{identities.length === 0 ? 'Add your first identity to get started' : 'No emails yet'}</span>
                      {identities.length === 0 && <button style={s.sendBtn} onClick={() => setAddingIdentity(true)}>Add identity</button>}
                    </div>
                  ) : visibleThreads.map(t => {
                    const lastMsg = t.messages?.[0]
                    const isUnread = !t.read
                    const otherParty = lastMsg?.direction === 'inbound' ? lastMsg.fromAddress.replace(/<.*>/, '').trim() : (t.participants?.find(p => p !== t.identity?.email) ?? 'You')
                    const initials = otherParty.slice(0, 2).toUpperCase()
                    return (
                      <div key={t.id} style={s.thread(isUnread)} onClick={() => openThread(t)}>
                        <div style={s.avatar(t.identity?.color ?? '#888')}>{initials}</div>
                        <div style={s.threadBody}>
                          <div style={s.threadRow}>
                            <span style={s.threadFrom(isUnread)}>{otherParty}<span style={s.pill(t.identity?.color ?? '#888')}>{t.identity?.name}</span></span>
                            <span style={s.threadTime}>{new Date(t.lastAt).toLocaleDateString()}</span>
                          </div>
                          <div style={s.threadSubject(isUnread)}>{t.subject}</div>
                          <div style={s.threadPreview}>{lastMsg?.bodyText?.slice(0, 90) ?? ''}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {composing && (
                <div style={s.composePanel}>
                  <div style={s.composeHeader}>
                    <span style={s.composeTitle}>New message</span>
                    <button style={s.composeClose} onClick={() => setComposing(false)}>✕</button>
                  </div>
                  <div style={s.composeField}>
                    <span style={s.fieldLabel}>From</span>
                    <select style={s.fromSelect} value={composeIdentityId} onChange={e => setComposeIdentityId(e.target.value)}>
                      {identities.map(id => <option key={id.id} value={id.id}>{id.email}</option>)}
                    </select>
                  </div>
                  <div style={s.composeField}>
                    <span style={s.fieldLabel}>To</span>
                    <input style={s.fieldInput} placeholder="recipient@example.com" value={composeTo} onChange={e => setComposeTo(e.target.value)} />
                  </div>
                  <div style={s.composeField}>
                    <span style={s.fieldLabel}>Subj</span>
                    <input style={s.fieldInput} placeholder="Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
                  </div>
                  <div style={s.composeBody}>
                    <textarea style={s.bodyInput} placeholder="Write your message…" value={composeText} onChange={e => setComposeText(e.target.value)} />
                  </div>
                  <div style={s.composeFoot}>
                    <button style={s.sendBtn} onClick={sendEmail} disabled={composeSending}>{composeSending ? 'Sending…' : 'Send'}</button>
                    <button style={s.discardBtn} onClick={() => setComposing(false)}>Discard</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {addingIdentity && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setAddingIdentity(false)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>Add identity</div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Display name</label>
              <input style={s.input} placeholder="e.g. Survival Storehouse" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Email address</label>
              <input style={s.input} placeholder="mark@yourdomain.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>Colour</label>
              <div style={s.colorRow}>
                {COLORS.map(c => <div key={c} style={s.colorSwatch(c, newColor === c)} onClick={() => setNewColor(c)} />)}
              </div>
            </div>
            {user?.plan === 'trial' && identities.length >= 3 && (
              <div style={{ fontSize: 13, color: '#993C1D', background: '#FAECE7', padding: '10px 12px', borderRadius: 8 }}>
                You've reached the 3-domain trial limit. Upgrade to add more.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.modalBtn} onClick={addIdentity} disabled={user?.plan === 'trial' && identities.length >= 3}>Add identity</button>
              <button style={s.cancelBtn} onClick={() => setAddingIdentity(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
