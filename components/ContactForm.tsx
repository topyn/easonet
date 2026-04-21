import { useState } from 'react'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name || !email || !message) return
    setLoading(true); setError('')
    const res = await fetch('/api/contact/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Something went wrong'); return }
    setSent(true)
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    background: '#101010', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, fontSize: 14, color: '#f0f0ee',
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    boxSizing: 'border-box' as const, transition: 'border-color .2s',
  }

  if (sent) return (
    <div style={{background:'rgba(62,207,142,0.06)',border:'1px solid rgba(62,207,142,0.2)',borderRadius:14,padding:'40px 32px',textAlign:'center'}}>
      <div style={{fontSize:28,marginBottom:12}}>✓</div>
      <div style={{fontFamily:"'Syne', sans-serif",fontWeight:800,fontSize:20,letterSpacing:-0.5,color:'#3ECF8E',marginBottom:8}}>Message sent</div>
      <div style={{fontSize:14,color:'#666',lineHeight:1.7}}>We'll get back to you at {email} within 24 hours.</div>
    </div>
  )

  return (
    <div style={{background:'#101010',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'32px'}}>
      {error && <div style={{fontFamily:"'DM Mono', monospace",fontSize:12,color:'#ff6b6b',background:'rgba(255,107,107,0.08)',border:'1px solid rgba(255,107,107,0.2)',padding:'10px 14px',borderRadius:8,marginBottom:16}}>{error}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div>
          <label style={{fontFamily:"'DM Mono', monospace",fontSize:10,color:'#444',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'.08em'}}>Your name</label>
          <input style={inputStyle} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{fontFamily:"'DM Mono', monospace",fontSize:10,color:'#444',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'.08em'}}>Email address</label>
          <input style={inputStyle} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label style={{fontFamily:"'DM Mono', monospace",fontSize:10,color:'#444',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'.08em'}}>Message</label>
          <textarea
            style={{...inputStyle,resize:'none',height:120,lineHeight:1.6}}
            placeholder="Tell us what you're working on or ask us anything..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>
        <button
          onClick={submit}
          disabled={loading || !name || !email || !message}
          style={{padding:'13px',background:loading||!name||!email||!message?'#1a1a1a':'#7B6EF6',color:loading||!name||!email||!message?'#333':'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:loading||!name||!email||!message?'not-allowed':'pointer',fontFamily:"'DM Sans', sans-serif",transition:'background .2s'}}
        >
          {loading ? '// sending…' : 'Send message →'}
        </button>
        <div style={{fontFamily:"'DM Mono', monospace",fontSize:10,color:'#222',textAlign:'center'}}>we reply within 24 hours</div>
      </div>
    </div>
  )
}
