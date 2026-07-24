import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const OnboardingWizard = dynamic(() => import('../components/OnboardingWizard'), { ssr: false })
import { authFetch, getToken, clearTokens, setTokens } from '../lib/auth-client'

interface User { id: string; email: string; plan: string; trialEndsAt: string | null }
interface Identity { id: string; name: string; email: string; domain: string; color: string; dnsVerified: boolean }
interface AttachmentMeta { id: string; filename: string; mimeType: string; size: number }
interface Message { id: string; direction: string; fromAddress: string; toAddress: string; ccAddress?: string | null; bccAddress?: string | null; bodyText: string; bodyHtml?: string; createdAt: string; attachments?: AttachmentMeta[]; _count?: { attachments: number } }
interface StagedAttachment { path?: string; attachmentId?: string; filename: string; mimeType: string; size: number }
interface Thread { id: string; subject: string; lastAt: string; read: boolean; status: string; participants: string[]; identity: Identity; messages: Message[] }
interface DnsResult { mx: boolean; spf: boolean }

const COLORS = ['#7B6EF6','#3ECF8E','#F5A623','#60A5FA','#F87171','#A78BFA','#34D399']

const BG = '#080808'
const BG2 = '#101010'
const BG3 = '#161616'
const BORDER = 'rgba(255,255,255,0.07)'
const BORDER2 = 'rgba(255,255,255,0.12)'
const TEXT = '#f0f0ee'
const MUTED = '#666'
const ACCENT = '#7B6EF6'

function api(url: string) { return authFetch(url).then(r => r.json()) }
function post(url: string, body: object) { return authFetch(url, { method: 'POST', body: JSON.stringify(body) }) }
function patch(url: string, body: object) { return authFetch(url, { method: 'PATCH', body: JSON.stringify(body) }) }

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

function formatBytes(n: number) {
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}

function normalizeSubject(subject: string): string {
  return subject.replace(/^((re|fwd?):\s*)+/i, '').trim()
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── DNS Wizard ────────────────────────────────────────────────────────────
type DnsProvider = 'Cloudflare' | 'GoDaddy' | 'Namecheap'
const DNS_PROVIDERS: DnsProvider[] = ['Cloudflare', 'GoDaddy', 'Namecheap']

function DnsWizard({ identity, onVerified }: { identity: Identity; onVerified: () => void }) {
  const [step, setStep] = useState<'records' | 'checking' | 'done'>('records')
  const [dns, setDns] = useState<DnsResult | null>(null)
  const [provider, setProvider] = useState<DnsProvider>('Cloudflare')
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

  const providerNote: Record<DnsProvider, string> = {
    Cloudflare: 'DNS → Add record → make sure the proxy (orange cloud) is OFF',
    GoDaddy: 'My Products → your domain → DNS → Add record',
    Namecheap: 'Domain List → Manage → Advanced DNS → Add New Record',
  }

  if (step === 'done') return (
    <div style={{ padding: 32 }}>
      <div style={{ background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 10, padding: '20px 24px', color: '#3ECF8E', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
        ✓ DNS verified — {identity.email} is live
      </div>
    </div>
  )

  const RecordBox = ({ label, fields, extra }: { label: string; fields: {k: string; v: string}[]; extra?: string }) => (
    <div style={{ background: BG3, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '20px 24px', marginBottom: 12 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT, textTransform: 'uppercase' as const, letterSpacing: '.1em', marginBottom: 14 }}>{label}</div>
      {fields.map(f => (
        <div key={f.k} style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>{f.k}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: TEXT, flex: 1, wordBreak: 'break-all' as const }}>{f.v}</span>
            <button onClick={() => copy(f.v)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: '3px 10px', border: `1px solid ${BORDER2}`, borderRadius: 5, cursor: 'pointer', background: 'transparent', color: MUTED, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>copy</button>
          </div>
        </div>
      ))}
      {extra && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#555', marginTop: 8 }}>{extra}</div>}
    </div>
  )

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: TEXT, letterSpacing: -0.5, marginBottom: 6 }}>Set up {identity.domain}</div>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 24, lineHeight: 1.6 }}>Add two DNS records to your domain, then click verify. Usually takes under 5 minutes.</div>

      {/* Provider selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', textTransform: 'uppercase' as const, letterSpacing: '.1em', marginBottom: 10 }}>// your dns provider</div>
        <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {DNS_PROVIDERS.map(p => (
            <button key={p} onClick={() => setProvider(p)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, background: provider === p ? ACCENT : 'transparent', color: provider === p ? '#fff' : MUTED, transition: 'all .15s' }}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', marginTop: 10 }}>// navigate to: {providerNote[provider]}</div>
      </div>

      <RecordBox label="MX record — inbound routing" fields={[
        { k: 'Type', v: 'MX' },
        { k: 'Name / Host', v: '@' },
        { k: 'Value / Mail server', v: 'route1.mx.cloudflare.net' },
        { k: 'Priority', v: '13' },
      ]} extra={provider === 'Cloudflare' ? '⚠ Make sure Proxy is OFF (grey cloud, not orange)' : undefined} />

      <RecordBox label="TXT record — SPF (prevents spam)" fields={[
        { k: 'Type', v: 'TXT' },
        { k: 'Name / Host', v: '@' },
        { k: 'Value / Content', v: 'v=spf1 include:_spf.brevo.com ~all' },
      ]} />

      <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: '#444', fontFamily: "'DM Mono', monospace" }}>
        // need help? <a href="/setup" target="_blank" style={{ color: ACCENT, textDecoration: 'none' }}>view full setup guide →</a>
      </div>

      {step === 'checking' && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[{ label: 'MX record', ok: dns?.mx }, { label: 'SPF record', ok: dns?.spf }].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: r.ok === undefined ? '#222' : r.ok ? 'rgba(62,207,142,0.15)' : 'rgba(255,107,107,0.15)', border: `1px solid ${r.ok === undefined ? '#333' : r.ok ? 'rgba(62,207,142,0.4)' : 'rgba(255,107,107,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: r.ok ? '#3ECF8E' : '#ff6b6b', flexShrink: 0 }}>
                {r.ok === undefined ? '' : r.ok ? '✓' : '✗'}
              </div>
              <span style={{ color: r.ok ? '#3ECF8E' : MUTED }}>{r.label} {r.ok ? 'verified' : 'checking…'}</span>
            </div>
          ))}
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', marginTop: 4 }}>// polling every 4 seconds — dns can take up to 10 mins</div>
        </div>
      )}

      <button
        onClick={startChecking}
        disabled={step === 'checking'}
        style={{ padding: '10px 24px', background: step === 'checking' ? '#1a1a1a' : ACCENT, color: step === 'checking' ? MUTED : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: step === 'checking' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
      >
        {step === 'checking' ? 'Checking…' : "I've added the records — verify now"}
      </button>
    </div>
  )
}

// ── Trial Banner ───────────────────────────────────────────────────────────
function TrialBanner({ plan, trialEndsAt, identityCount }: { plan: string; trialEndsAt: string | null; identityCount: number }) {
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)) : 0
  const expired = daysLeft === 0 && plan === 'trial'

  async function upgrade(p: string) {
    const res = await post('/api/billing/checkout', { plan: p })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  if (plan !== 'trial') return null

  return (
    <div style={{ background: expired ? 'rgba(255,107,107,0.06)' : 'rgba(123,110,246,0.06)', borderBottom: `1px solid ${expired ? 'rgba(255,107,107,0.15)' : 'rgba(123,110,246,0.15)'}`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
      <span style={{ flex: 1, color: expired ? '#ff6b6b' : '#7B6EF6' }}>
        {expired ? '// trial expired — upgrade to continue' : `// trial: ${daysLeft}d remaining · ${Math.max(0, 3 - identityCount)} domain${3 - identityCount !== 1 ? 's' : ''} left`}
      </span>
      {['starter', 'growth', 'pro'].map((p, i) => (
        <button key={p} onClick={() => upgrade(p)} style={{ padding: '4px 12px', background: 'transparent', border: `1px solid ${BORDER2}`, borderRadius: 5, fontSize: 11, color: MUTED, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>
          {['$9.99', '$19.99', '$34.99'][i]}
        </button>
      ))}
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [identities, setIdentities] = useState<Identity[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeIdentityId, setActiveIdentityId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [threadActionBusy, setThreadActionBusy] = useState(false)
  const [wizardIdentity, setWizardIdentity] = useState<Identity | null>(null)
  const [composing, setComposing] = useState(false)
  const [addingIdentity, setAddingIdentity] = useState(false)
  const [composeIdentityId, setComposeIdentityId] = useState('')
  const [composeTo, setComposeTo] = useState('')
  const [composeCc, setComposeCc] = useState('')
  const [composeBcc, setComposeBcc] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [composeSubject, setComposeSubject] = useState('')
  const [composeText, setComposeText] = useState('')
  const [composeSending, setComposeSending] = useState(false)
  const [composeError, setComposeError] = useState('')
  const [composeAttachments, setComposeAttachments] = useState<StagedAttachment[]>([])
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    try {
      const token = localStorage.getItem('easonet_token')
      const userStr = localStorage.getItem('easonet_user')
      if (!token || !userStr) { router.replace('/login'); return }
      setUser(JSON.parse(userStr))
      setLoading(false)
      fetch('/api/auth/session', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => {
          if (data.user) {
            setUser(data.user)
            if (data.user) setTokens(getToken(), localStorage.getItem('easonet_refresh_token') || '', data.user)
          }
        })
    } catch { router.replace('/login') }
  }, [])

  const loadIdentities = useCallback(async () => {
    const data = await api('/api/identities')
    const list: Identity[] = Array.isArray(data) ? data : []
    setIdentities(list)
    if (list.length > 0 && !composeIdentityId) setComposeIdentityId(list[0].id)
    return list
  }, [composeIdentityId])

  const threadsUrl = useCallback((cursor?: string) => {
    const params = new URLSearchParams()
    if (activeIdentityId) params.set('identityId', activeIdentityId)
    if (search) params.set('q', search)
    if (cursor) params.set('cursor', cursor)
    if (showArchived) params.set('status', 'archived')
    const qs = params.toString()
    return qs ? `/api/emails/threads?${qs}` : '/api/emails/threads'
  }, [activeIdentityId, search, showArchived])

  const loadThreads = useCallback(async () => {
    const data = await api(threadsUrl())
    setThreads(Array.isArray(data.threads) ? data.threads : [])
    setNextCursor(data.nextCursor ?? null)
  }, [threadsUrl])

  const loadMoreThreads = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const data = await api(threadsUrl(nextCursor))
    setThreads(prev => [...prev, ...(Array.isArray(data.threads) ? data.threads : [])])
    setNextCursor(data.nextCursor ?? null)
    setLoadingMore(false)
  }, [threadsUrl, nextCursor, loadingMore])

  useEffect(() => { if (!loading) loadIdentities() }, [loading])
  useEffect(() => { if (!loading) loadThreads() }, [loading, activeIdentityId, search, showArchived])

  // Debounce the search box into `search`
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  async function openThread(t: Thread) {
    setReplyError('')
    const data = await api(`/api/emails/thread/${t.id}`)
    setActiveThread(data.id ? data : { ...t, messages: t.messages ?? [] })
  }

  async function setThreadArchived(threadId: string, archived: boolean) {
    setThreadActionBusy(true)
    try {
      await patch(`/api/emails/thread/${threadId}`, { status: archived ? 'archived' : 'open' })
      setActiveThread(null)
      await loadThreads()
    } finally {
      setThreadActionBusy(false)
    }
  }

  async function markThreadUnread(threadId: string) {
    setThreadActionBusy(true)
    try {
      await patch(`/api/emails/thread/${threadId}`, { read: false })
      setActiveThread(null)
      await loadThreads()
    } finally {
      setThreadActionBusy(false)
    }
  }

  function forwardMessage(m: Message) {
    if (!activeThread) return
    const quoted = `\n\n---------- Forwarded message ----------\nFrom: ${m.fromAddress}\nDate: ${new Date(m.createdAt).toLocaleString()}\nSubject: ${activeThread.subject}\nTo: ${m.toAddress}${m.ccAddress ? `\nCc: ${m.ccAddress}` : ''}\n\n${m.bodyText}`
    setComposeIdentityId(activeThread.identity.id)
    setComposeTo('')
    setComposeCc('')
    setComposeBcc('')
    setShowCcBcc(false)
    setComposeSubject(`Fwd: ${normalizeSubject(activeThread.subject)}`)
    setComposeText(quoted)
    setComposeAttachments((m.attachments ?? []).map(a => ({ attachmentId: a.id, filename: a.filename, mimeType: a.mimeType, size: a.size })))
    setComposeError('')
    setComposing(true)
  }

  async function stageAttachments(files: FileList | null) {
    if (!files || files.length === 0) return
    setComposeError('')
    setAttachmentUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setComposeError(`"${file.name}" is too large — max ${formatBytes(MAX_ATTACHMENT_BYTES)}`)
          continue
        }
        const dataBase64 = await fileToBase64(file)
        const res = await post('/api/emails/attachments/upload', {
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataBase64,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setComposeError(data.error || `Failed to upload "${file.name}"`)
          continue
        }
        const meta: StagedAttachment = await res.json()
        setComposeAttachments(prev => [...prev, meta])
      }
    } finally {
      setAttachmentUploading(false)
    }
  }

  function attachmentKey(a: StagedAttachment) {
    return a.path ?? a.attachmentId ?? a.filename
  }

  function removeAttachment(key: string) {
    setComposeAttachments(prev => prev.filter(a => attachmentKey(a) !== key))
  }

  async function downloadAttachment(id: string) {
    const data = await api(`/api/emails/attachments/${id}`)
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
  }

  async function sendEmail() {
    if (!composeTo || !composeSubject || !composeText || !composeIdentityId) return
    setComposeSending(true)
    setComposeError('')
    try {
      const res = await post('/api/emails/send', { identityId: composeIdentityId, to: composeTo, cc: composeCc || undefined, bcc: composeBcc || undefined, subject: composeSubject, text: composeText, attachments: composeAttachments })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setComposeError(data.error ? JSON.stringify(data.error) : 'Failed to send — please try again')
        return
      }
      setComposing(false)
      setComposeTo(''); setComposeCc(''); setComposeBcc(''); setShowCcBcc(false); setComposeSubject(''); setComposeText(''); setComposeAttachments([])
      loadThreads()
    } catch {
      setComposeError('Failed to send — check your connection and try again')
    } finally {
      setComposeSending(false)
    }
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
    clearTokens()
    router.replace('/login')
  }

  if (loading) return (
    <div style={{ background: BG, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333' }}>
      // loading…
    </div>
  )

  const visibleThreads = activeIdentityId ? threads.filter(t => t.identity?.id === activeIdentityId) : threads
  const unreadCount = threads.filter(t => !t.read).length

  // Shared input style
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    fontSize: 13,
    color: TEXT,
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box',
  }

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BG}; color: ${TEXT}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
        select option { background: ${BG2}; color: ${TEXT}; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: "'DM Sans', sans-serif", background: BG, color: TEXT, overflow: 'hidden' }}>

        {/* Trial banner */}
        {user && <TrialBanner plan={user.plan} trialEndsAt={user.trialEndsAt} identityCount={identities.length} />}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Sidebar */}
          <div style={{ width: 220, background: BG2, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Logo */}
            <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: -0.5, color: TEXT }}>
                easonet
              </div>
            </div>

            {/* Identities */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              <div style={{ padding: '0 16px', marginBottom: 10 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>// identities</div>

                {/* All inboxes */}
                <div
                  onClick={() => { setActiveIdentityId(null); setActiveThread(null); setShowArchived(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: !activeIdentityId && !showArchived ? 'rgba(255,255,255,0.04)' : 'transparent', marginBottom: 2, border: !activeIdentityId && !showArchived ? `1px solid ${BORDER}` : '1px solid transparent' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#444', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, color: !activeIdentityId && !showArchived ? TEXT : MUTED, fontWeight: !activeIdentityId && !showArchived ? 500 : 400 }}>All inboxes</div>
                    {unreadCount > 0 && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ACCENT }}>{unreadCount} unread</div>}
                  </div>
                </div>

                {/* Archived */}
                <div
                  onClick={() => { setActiveIdentityId(null); setActiveThread(null); setShowArchived(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: showArchived ? 'rgba(255,255,255,0.04)' : 'transparent', marginBottom: 2, border: showArchived ? `1px solid ${BORDER}` : '1px solid transparent' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#555', flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: showArchived ? TEXT : MUTED, fontWeight: showArchived ? 500 : 400 }}>Archived</div>
                </div>

                {identities.map(id => (
                  <div
                    key={id.id}
                    onClick={() => { setActiveIdentityId(id.id); setActiveThread(null); setShowArchived(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: !showArchived && activeIdentityId === id.id ? 'rgba(255,255,255,0.04)' : 'transparent', marginBottom: 2, border: !showArchived && activeIdentityId === id.id ? `1px solid ${BORDER}` : '1px solid transparent' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: id.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, color: TEXT, fontWeight: activeIdentityId === id.id ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{id.name}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{id.email}</div>
                    </div>
                    {!id.dnsVerified && (
                      <div
                        title="DNS not verified"
                        onClick={e => { e.stopPropagation(); setWizardIdentity(id) }}
                        style={{ width: 5, height: 5, borderRadius: '50%', background: '#F5A623', flexShrink: 0 }}
                      />
                    )}
                  </div>
                ))}

                <button
                  onClick={() => setAddingIdentity(true)}
                  style={{ width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: 11, color: '#333', border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", letterSpacing: '.03em' }}
                >
                  + add identity
                </button>
              </div>
            </div>

            {/* Tools nav */}
            <div style={{ padding: '8px 16px', borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>// tools</div>
              <a href="/waitlists" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, marginBottom: 2, textDecoration: 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3ECF8E', flexShrink: 0 }} />
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: MUTED }}>waitlists</div>
              </a>
              <a href="/stores" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, marginBottom: 2, textDecoration: 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60A5FA', flexShrink: 0 }} />
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: MUTED }}>stores</div>
              </a>
              <a href="/brandpages" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, marginBottom: 2, textDecoration: 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171', flexShrink: 0 }} />
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: MUTED }}>brand pages</div>
              </a>
              <div style={{ margin: '8px 10px 4px', borderTop: '1px solid rgba(255,255,255,.05)' }} />
              <a href={process.env.NEXT_PUBLIC_DISCORD_URL || '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, marginBottom: 2, textDecoration: 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5865F2', flexShrink: 0 }} />
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: MUTED }}>community</div>
              </a>
              <a href="/dns-check" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, marginBottom: 2, textDecoration: 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5A623', flexShrink: 0 }} />
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: MUTED }}>dns checker</div>
              </a>
            </div>

            {/* User row */}
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{user?.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: user?.plan === 'trial' ? '#F5A623' : '#3ECF8E', background: user?.plan === 'trial' ? 'rgba(245,166,35,0.1)' : 'rgba(62,207,142,0.1)', border: `1px solid ${user?.plan === 'trial' ? 'rgba(245,166,35,0.2)' : 'rgba(62,207,142,0.2)'}`, padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase' as const, letterSpacing: '.08em' }}>
                  {user?.plan === 'trial' ? 'trial' : user?.plan}
                </div>
              </div>
              <button onClick={logout} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>// sign out</button>
            </div>
          </div>

          {/* Main */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

            {/* DNS Wizard */}
            {wizardIdentity && (
              <div style={{ flex: 1, overflowY: 'auto', background: BG }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: `1px solid ${BORDER}` }}>
                  <button onClick={() => setWizardIdentity(null)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: ACCENT, border: 'none', background: 'none', cursor: 'pointer' }}>← back</button>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: MUTED }}>// dns setup</div>
                </div>
                <DnsWizard identity={wizardIdentity} onVerified={async () => { setWizardIdentity(null); await loadIdentities() }} />
              </div>
            )}

            {!wizardIdentity && (
              <>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: `1px solid ${BORDER}`, gap: 10, flexShrink: 0 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: -0.5, color: TEXT }}>
                      {showArchived ? 'Archived' : activeIdentityId ? identities.find(i => i.id === activeIdentityId)?.name ?? 'Inbox' : 'All inboxes'}
                    </div>
                  </div>
                  {!activeThread && (
                    <input
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="search subject or address…"
                      style={{ width: 220, padding: '6px 12px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, color: TEXT, outline: 'none', fontFamily: "'DM Mono', monospace" }}
                    />
                  )}
                  <button onClick={loadThreads} style={{ padding: '6px 12px', border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'transparent', color: MUTED, fontFamily: "'DM Mono', monospace" }}>↻</button>
                  <button onClick={() => setComposing(true)} style={{ padding: '7px 18px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Compose</button>
                </div>

                {/* Thread detail */}
                {activeThread ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => setActiveThread(null)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: ACCENT, border: 'none', background: 'none', cursor: 'pointer' }}>← back</button>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: -0.3, flex: 1 }}>{activeThread.subject}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: activeThread.identity?.color, padding: '3px 10px', border: `1px solid ${activeThread.identity?.color}33`, borderRadius: 100 }}>{activeThread.identity?.name}</span>
                      <button
                        onClick={() => markThreadUnread(activeThread.id)}
                        disabled={threadActionBusy}
                        style={{ padding: '5px 12px', border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, cursor: threadActionBusy ? 'not-allowed' : 'pointer', background: 'transparent', color: MUTED, fontFamily: "'DM Mono', monospace" }}
                      >Mark unread</button>
                      <button
                        onClick={() => setThreadArchived(activeThread.id, activeThread.status !== 'archived')}
                        disabled={threadActionBusy}
                        style={{ padding: '5px 12px', border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, cursor: threadActionBusy ? 'not-allowed' : 'pointer', background: 'transparent', color: MUTED, fontFamily: "'DM Mono', monospace" }}
                      >{activeThread.status === 'archived' ? 'Unarchive' : 'Archive'}</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {(activeThread.messages ?? []).map(m => (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', marginBottom: 6 }}>
                            {m.direction === 'outbound' ? `you (${m.fromAddress})` : m.fromAddress} · {new Date(m.createdAt).toLocaleString()}
                            {m.ccAddress && <> · cc: {m.ccAddress}</>}
                          </div>
                          <div style={{ maxWidth: '70%', background: m.direction === 'outbound' ? ACCENT : BG3, color: TEXT, padding: '12px 16px', borderRadius: m.direction === 'outbound' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', border: m.direction === 'outbound' ? 'none' : `1px solid ${BORDER}` }}>
                            {m.bodyText}
                          </div>
                          {(m.attachments ?? []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, maxWidth: '70%' }}>
                              {m.attachments!.map(a => (
                                <button
                                  key={a.id}
                                  onClick={() => downloadAttachment(a.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: BG3, border: `1px solid ${BORDER2}`, borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT, cursor: 'pointer' }}
                                >
                                  📎 {a.filename} <span style={{ color: MUTED }}>({formatBytes(a.size)})</span>
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => forwardMessage(m)}
                            style={{ marginTop: 6, padding: '3px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, color: '#444', fontFamily: "'DM Mono', monospace" }}
                          >↪ forward</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}` }}>
                      {replyError && (
                        <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 7, color: '#ff6b6b', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{replyError}</div>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <textarea
                          id="quick-reply"
                          placeholder="// quick reply…"
                          style={{ flex: 1, background: BG3, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: TEXT, resize: 'none', outline: 'none', height: 64, fontFamily: "'DM Sans', sans-serif" }}
                        />
                        <button
                          onClick={async () => {
                            const el = document.getElementById('quick-reply') as HTMLTextAreaElement
                            if (!el?.value) return
                            setReplyError('')
                            try {
                              const others = activeThread.participants.filter(p => p !== activeThread.identity.email)
                              const replyTo = others[0] ?? activeThread.participants[0]
                              const replyCc = others.slice(1)
                              const res = await post('/api/emails/send', {
                                identityId: activeThread.identity.id,
                                to: replyTo,
                                cc: replyCc.length ? replyCc.join(', ') : undefined,
                                subject: `Re: ${activeThread.subject}`,
                                text: el.value,
                                threadId: activeThread.id,
                              })
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}))
                                setReplyError(data.error ? JSON.stringify(data.error) : 'Failed to send — please try again')
                                return
                              }
                              el.value = ''
                              openThread(activeThread)
                              loadThreads()
                            } catch {
                              setReplyError('Failed to send — check your connection and try again')
                            }
                          }}
                          style={{ padding: '10px 20px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-end', fontFamily: "'DM Sans', sans-serif" }}
                        >Send</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Thread list */
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {visibleThreads.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#333' }}>
                          {identities.length === 0 ? '// add your first identity to get started' : '// no emails yet'}
                        </div>
                        {identities.length === 0 && (
                          <button onClick={() => setAddingIdentity(true)} style={{ padding: '8px 20px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                            Add identity →
                          </button>
                        )}
                      </div>
                    ) : visibleThreads.map(t => {
                      const lastMsg = t.messages?.[0]
                      const isUnread = !t.read
                      const otherParty = lastMsg?.direction === 'inbound' ? lastMsg.fromAddress.replace(/<.*>/, '').trim() : (t.participants?.find(p => p !== t.identity?.email) ?? 'You')
                      const initials = otherParty.slice(0, 2).toUpperCase()
                      return (
                        <div
                          key={t.id}
                          onClick={() => openThread(t)}
                          style={{ display: 'flex', gap: 14, padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', background: isUnread ? 'rgba(255,255,255,0.015)' : 'transparent', alignItems: 'flex-start' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                          onMouseLeave={e => (e.currentTarget.style.background = isUnread ? 'rgba(255,255,255,0.015)' : 'transparent')}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: (t.identity?.color ?? ACCENT) + '18', color: t.identity?.color ?? ACCENT, border: `1px solid ${(t.identity?.color ?? ACCENT)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>
                            {initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: isUnread ? 500 : 400, color: isUnread ? TEXT : MUTED }}>
                                {otherParty}
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: t.identity?.color, padding: '2px 8px', border: `1px solid ${(t.identity?.color ?? ACCENT)}30`, borderRadius: 100, marginLeft: 8 }}>{t.identity?.name}</span>
                              </span>
                              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', whiteSpace: 'nowrap' }}>{new Date(t.lastAt).toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: isUnread ? 500 : 400, color: isUnread ? TEXT : MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{t.subject}</div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {lastMsg?._count?.attachments ? '📎 ' : ''}{lastMsg?.bodyText?.slice(0, 80) ?? ''}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {nextCursor && (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 24px' }}>
                        <button
                          onClick={loadMoreThreads}
                          disabled={loadingMore}
                          style={{ padding: '8px 20px', border: `1px solid ${BORDER2}`, borderRadius: 7, fontSize: 12, cursor: loadingMore ? 'not-allowed' : 'pointer', background: 'transparent', color: MUTED, fontFamily: "'DM Mono', monospace" }}
                        >
                          {loadingMore ? 'Loading…' : 'Load more'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Compose panel */}
                {composing && (
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 500, background: BG2, border: `1px solid ${BORDER2}`, borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: `1px solid ${BORDER}`, background: BG3, borderRadius: '12px 12px 0 0' }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: MUTED }}>// new message</span>
                      <button onClick={() => setComposing(false)} style={{ fontSize: 14, color: MUTED, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                    {[
                      { label: 'from', content: (
                        <select value={composeIdentityId} onChange={e => setComposeIdentityId(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', cursor: 'pointer', color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>
                          {identities.map(id => <option key={id.id} value={id.id}>{id.email}</option>)}
                        </select>
                      )},
                      { label: 'to', content: (
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8 }}>
                          <input style={{ ...inputStyle, flex: 1, background: 'transparent', border: 'none', padding: 0 }} placeholder="recipient@example.com, another@example.com" value={composeTo} onChange={e => setComposeTo(e.target.value)} />
                          {!showCcBcc && (
                            <button onClick={() => setShowCcBcc(true)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#444', border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}>Cc/Bcc</button>
                          )}
                        </div>
                      )},
                      ...(showCcBcc ? [
                        { label: 'cc', content: <input style={{ ...inputStyle, background: 'transparent', border: 'none', padding: 0 }} placeholder="cc@example.com" value={composeCc} onChange={e => setComposeCc(e.target.value)} /> },
                        { label: 'bcc', content: <input style={{ ...inputStyle, background: 'transparent', border: 'none', padding: 0 }} placeholder="bcc@example.com" value={composeBcc} onChange={e => setComposeBcc(e.target.value)} /> },
                      ] : []),
                      { label: 'subj', content: <input style={{ ...inputStyle, background: 'transparent', border: 'none', padding: 0 }} placeholder="Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} /> },
                    ].map(f => (
                      <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: `1px solid ${BORDER}` }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#333', width: 30, flexShrink: 0 }}>{f.label}</span>
                        {f.content}
                      </div>
                    ))}
                    <div style={{ padding: '12px 18px', flex: 1 }}>
                      <textarea
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, resize: 'none', minHeight: 120, color: TEXT, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}
                        placeholder="Write your message…"
                        value={composeText}
                        onChange={e => setComposeText(e.target.value)}
                      />
                    </div>
                    {composeAttachments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 18px 12px' }}>
                        {composeAttachments.map(a => (
                          <div key={attachmentKey(a)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: BG3, border: `1px solid ${BORDER2}`, borderRadius: 6, fontSize: 11, fontFamily: "'DM Mono', monospace", color: TEXT }}>
                            <span>📎 {a.filename} <span style={{ color: MUTED }}>({formatBytes(a.size)})</span></span>
                            <button onClick={() => removeAttachment(attachmentKey(a))} style={{ border: 'none', background: 'none', color: MUTED, cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {composeError && (
                      <div style={{ margin: '0 18px 12px', padding: '8px 12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 7, color: '#ff6b6b', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{composeError}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: `1px solid ${BORDER}` }}>
                      <button onClick={sendEmail} disabled={composeSending} style={{ padding: '8px 20px', background: composeSending ? '#333' : ACCENT, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: composeSending ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                        {composeSending ? 'Sending…' : 'Send →'}
                      </button>
                      <button onClick={() => { setComposing(false); setComposeError('') }} style={{ padding: '8px 16px', border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, cursor: 'pointer', background: 'transparent', color: MUTED, fontFamily: "'DM Sans', sans-serif" }}>Discard</button>
                      <input ref={attachmentInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => { stageAttachments(e.target.files); e.target.value = '' }} />
                      <button onClick={() => attachmentInputRef.current?.click()} disabled={attachmentUploading} title="Attach files" style={{ marginLeft: 'auto', padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 13, cursor: attachmentUploading ? 'not-allowed' : 'pointer', background: 'transparent', color: MUTED, fontFamily: "'DM Sans', sans-serif" }}>
                        {attachmentUploading ? '…' : '📎'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add identity modal */}
      {addingIdentity && (
        <div onClick={e => e.target === e.currentTarget && setAddingIdentity(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
          <div style={{ background: BG2, border: `1px solid ${BORDER2}`, borderRadius: 14, padding: 32, width: 420, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: -0.5, color: TEXT, marginBottom: 6 }}>Add identity</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#333' }}>// new domain email address</div>
            </div>
            {[
              { label: 'display name', placeholder: 'e.g. Topyn', value: newName, set: setNewName },
              { label: 'email address', placeholder: 'mark@topyn.com', value: newEmail, set: setNewEmail },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>{f.label}</label>
                <input style={inputStyle} placeholder={f.placeholder} value={f.value} onChange={e => f.set(e.target.value)} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#444', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>colour</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setNewColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: newColor === c ? `2px solid ${TEXT}` : '2px solid transparent', boxSizing: 'border-box' }} />
                ))}
              </div>
            </div>
            {user?.plan === 'trial' && identities.length >= 3 && (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#F5A623', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', padding: '10px 14px', borderRadius: 8 }}>
                // trial limit reached — upgrade to add more
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addIdentity} disabled={user?.plan === 'trial' && identities.length >= 3} style={{ padding: '10px 24px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Add identity →
              </button>
              <button onClick={() => setAddingIdentity(false)} style={{ padding: '10px 16px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'transparent', color: MUTED, fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showWizard && (
        <OnboardingWizard
          authFetch={authFetch}
          onCancel={() => setShowWizard(false)}
          onComplete={async () => {
            setShowWizard(false)
            await loadIdentities()
          }}
        />
      )}
    </>
  )
}
