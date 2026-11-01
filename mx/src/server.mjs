import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { checkAuth, checkSpam, decide } from './checks.mjs'

const require = createRequire(import.meta.url)
const { SMTPServer } = require('smtp-server')

// Inbound-only SMTP. Rules that keep this safe and lossless:
// - Reject unknown recipients and foreign domains during RCPT (never accept-then-bounce:
//   bouncing to forged senders is how mail servers get blacklisted). We never relay.
// - Only answer "250 OK" after easonet confirms the message is stored. Any failure on our
//   side answers 451, and the sending server retries (for days), so nothing is lost.

function smtpError(code, message) {
  const err = new Error(message)
  err.responseCode = code
  return err
}

function readTls(config) {
  if (!config.tlsKeyPath || !config.tlsCertPath) return null
  try {
    return { key: fs.readFileSync(config.tlsKeyPath), cert: fs.readFileSync(config.tlsCertPath) }
  } catch (err) {
    console.error(`[tls] could not read certificate, STARTTLS disabled: ${err.message}`)
    return null
  }
}

export function createMxServer({ config, client, addressBook, resolver, logger = console }) {
  const recentConnections = new Map() // ip → timestamps in the last minute

  /** Stores the message and reports what easonet did with it. Throws an SMTP error to send back. */
  async function deliver({ message, session }) {
    const ip = session.remoteAddress
    const helo = session.hostNameAppearsAs
    const mailFrom = session.envelope.mailFrom ? session.envelope.mailFrom.address : ''
    const rcptTo = session.envelope.rcptTo.map(r => r.address.toLowerCase())

    const auth = await checkAuth(message, { ip, helo, mailFrom, hostname: config.hostname, resolver })
    const spam = await checkSpam(message, { rspamdUrl: config.rspamdUrl, ip, helo, mailFrom, rcptTo, hostname: config.hostname })
    const decision = decide(auth, spam)
    if (decision.verdict === 'reject' || decision.verdict === 'defer') throw smtpError(decision.code, decision.message)

    const sha256 = createHash('sha256').update(message).digest('hex')
    try {
      const { path, signedUrl } = await client.getUploadUrl(sha256, message.length)
      await client.uploadRaw(signedUrl, message)
      const result = await client.ingest({
        path, sha256, mailFrom, rcptTo,
        remoteAddress: ip,
        auth: { spf: auth.spf, dkim: auth.dkim, dmarc: auth.dmarc },
        spam: { score: spam?.score, action: decision.verdict === 'spam' ? 'spam' : 'accept' },
      })
      logger.log(`[deliver] ${sha256.slice(0, 12)} from=${mailFrom || '<>'} ip=${ip} → ${JSON.stringify(result.results)}`)
      return result
    } catch (err) {
      logger.error(`[deliver] ${sha256.slice(0, 12)} failed, asking sender to retry: ${err.message}`)
      throw smtpError(451, '4.3.0 Temporary problem storing your message, please try again later')
    }
  }

  const tls = readTls(config)

  const smtp = new SMTPServer({
    name: config.hostname,
    banner: 'easonet mail',
    size: config.maxMessageBytes,
    authOptional: true,
    disabledCommands: ['AUTH'], // inbound only: nobody logs in, nobody relays
    hideSTARTTLS: !tls,
    ...(tls || {}),
    logger: false,
    socketTimeout: 60_000,
    closeTimeout: 30_000,
    maxClients: 200,

    onConnect(session, callback) {
      const now = Date.now()
      const recent = (recentConnections.get(session.remoteAddress) || []).filter(t => now - t < 60_000)
      recent.push(now)
      recentConnections.set(session.remoteAddress, recent)
      if (recent.length > config.connectionsPerMinutePerIp) {
        return callback(smtpError(421, '4.7.0 Too many connections, slow down'))
      }
      callback()
    },

    onMailFrom(_address, _session, callback) {
      callback()
    },

    onRcptTo(address, session, callback) {
      if (session.envelope.rcptTo.length >= config.maxRecipients) {
        return callback(smtpError(452, '4.5.3 Too many recipients'))
      }
      const verdict = addressBook.resolve(address.address)
      if (verdict === 'accept') return callback()
      if (verdict === 'not-ready') return callback(smtpError(451, '4.3.0 Mail system starting, try again later'))
      if (verdict === 'not-our-domain') return callback(smtpError(550, '5.7.1 Relaying denied'))
      if (verdict === 'invalid') return callback(smtpError(553, '5.1.3 Invalid recipient address'))
      return callback(smtpError(550, '5.1.1 No such user here'))
    },

    onData(stream, session, callback) {
      const chunks = []
      stream.on('data', c => chunks.push(c))
      stream.on('error', err => callback(err))
      stream.on('end', () => {
        if (stream.sizeExceeded) return callback(smtpError(552, '5.3.4 Message too big'))
        deliver({ message: Buffer.concat(chunks), session })
          .then(() => callback(null, 'Message accepted'))
          .catch(err => callback(err.responseCode ? err : smtpError(451, '4.3.0 Temporary problem, please try again later')))
      })
    },
  })

  // Forget old per-IP counters so the map doesn't grow forever.
  const sweeper = setInterval(() => {
    const now = Date.now()
    for (const [ip, ts] of recentConnections) if (!ts.some(t => now - t < 60_000)) recentConnections.delete(ip)
  }, 60_000)
  sweeper.unref?.()

  smtp.on('error', err => logger.error(`[smtp] ${err.message}`))

  return {
    smtp,
    deliver,
    /** Re-read the TLS certificate (call after certbot renews it). */
    reloadTls() {
      const fresh = readTls(config)
      if (fresh) smtp.updateSecureContext(fresh)
      return !!fresh
    },
  }
}
