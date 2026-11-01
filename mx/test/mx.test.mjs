import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createHash } from 'node:crypto'
import nodemailer from 'nodemailer'
import { signRequest, createEasonetClient } from '../src/easonet.mjs'
import { createAddressBook, resolveAgainst } from '../src/addresses.mjs'
import { decide } from '../src/checks.mjs'
import { createMxServer } from '../src/server.mjs'

const SECRET = 'test-secret-'.padEnd(48, 'x')
const DOMAINS = { 'shop.test': { catchAll: false, addresses: ['hello', 'orders'] } }

// --- fake easonet: checks every signature exactly as easonet does ---------------------------
const state = { uploads: new Map(), ingests: [], ingestStatus: 200, badSignatures: 0 }
let easonet, easonetUrl

function readBody(req) {
  return new Promise(resolve => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

function verified(req, body) {
  const ts = Number(req.headers['x-easonet-timestamp'])
  const sig = req.headers['x-easonet-signature']
  const path = req.url.split('?')[0]
  const ok = Math.abs(Date.now() / 1000 - ts) < 300 && sig === signRequest(SECRET, ts, req.method, path, body)
  if (!ok) state.badSignatures++
  return ok
}

// No DNS in tests: every lookup fails fast, so SPF/DKIM/DMARC come back none/temperror.
const resolver = async () => { const e = new Error('no dns in tests'); e.code = 'ENOTFOUND'; throw e }

let mx, port, transport
const quiet = { log() {}, error() {} }

before(async () => {
  easonet = http.createServer(async (req, res) => {
    const body = await readBody(req)
    const json = (code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)) }
    if (req.url.startsWith('/upload/')) { state.uploads.set(req.url.slice(8), body); return json(200, {}) }
    if (!verified(req, body.toString())) return json(401, { error: 'Unauthorized' })
    if (req.url === '/api/mail/address-list') return json(200, { generatedAt: new Date().toISOString(), domains: DOMAINS })
    if (req.url === '/api/mail/upload-url') {
      const { sha256 } = JSON.parse(body)
      const path = `raw/2026/10/31/${sha256}-00000000-0000-0000-0000-000000000000.eml`
      return json(200, { path, signedUrl: `${easonetUrl}/upload/${path}` })
    }
    if (req.url === '/api/mail/ingest') {
      const payload = JSON.parse(body)
      state.ingests.push(payload)
      if (state.ingestStatus !== 200) return json(state.ingestStatus, { error: 'boom' })
      return json(200, { ok: true, results: payload.rcptTo.map(r => ({ rcpt: r, result: 'stored' })) })
    }
    json(404, {})
  })
  await new Promise(r => easonet.listen(0, '127.0.0.1', r))
  easonetUrl = `http://127.0.0.1:${easonet.address().port}`

  const config = {
    hostname: 'mx-test.easonet.test', easonetUrl, secret: SECRET,
    maxMessageBytes: 200_000, maxRecipients: 50, connectionsPerMinutePerIp: 1000,
    tlsKeyPath: '', tlsCertPath: '', rspamdUrl: '',
  }
  const client = createEasonetClient(config)
  const addressBook = createAddressBook({ client, refreshMs: 60_000, logger: quiet })
  await addressBook.start()
  mx = createMxServer({ config, client, addressBook, resolver, logger: quiet })
  await new Promise(r => mx.smtp.listen(0, '127.0.0.1', r))
  port = mx.smtp.server.address().port
  transport = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false, ignoreTLS: true })
})

after(async () => {
  transport.close()
  await new Promise(r => mx.smtp.close(r))
  await new Promise(r => easonet.close(r))
})

beforeEach(() => {
  state.ingests = []
  state.uploads.clear()
  state.ingestStatus = 200
  state.badSignatures = 0
})

const raw = (to, extra = '') => [
  'From: Customer <customer@example.net>',
  `To: ${to}`,
  'Subject: Do you ship to Perth?',
  'Message-ID: <abc123@example.net>',
  '',
  `Hi! Just checking about shipping.${extra}`,
  '',
].join('\r\n')

// --- unit rules -------------------------------------------------------------------------------
test('recipient rules', () => {
  assert.equal(resolveAgainst(DOMAINS, 'hello@shop.test'), 'accept')
  assert.equal(resolveAgainst(DOMAINS, 'HELLO@Shop.Test'), 'accept')
  assert.equal(resolveAgainst(DOMAINS, 'hello+orders@shop.test'), 'accept')
  assert.equal(resolveAgainst(DOMAINS, 'postmaster@shop.test'), 'accept')
  assert.equal(resolveAgainst(DOMAINS, 'nobody@shop.test'), 'unknown-user')
  assert.equal(resolveAgainst(DOMAINS, 'hello@other.test'), 'not-our-domain')
  assert.equal(resolveAgainst(DOMAINS, 'not-an-address'), 'invalid')
  assert.equal(resolveAgainst({ 'c.test': { catchAll: true, addresses: ['a'] } }, 'zzz@c.test'), 'accept')
  assert.equal(resolveAgainst({ 'e.test': { catchAll: true, addresses: [] } }, 'postmaster@e.test'), 'unknown-user')
})

test('auth/spam decisions', () => {
  assert.equal(decide({ dmarc: 'fail', dmarcPolicy: 'reject' }, null).verdict, 'reject')
  assert.equal(decide({ dmarc: 'fail', dmarcPolicy: 'quarantine' }, null).verdict, 'spam')
  assert.equal(decide({ dmarc: 'pass', dmarcPolicy: 'reject' }, null).verdict, 'accept')
  assert.equal(decide({ dmarc: 'none' }, { action: 'add header' }).verdict, 'spam')
  assert.equal(decide({ dmarc: 'none' }, { action: 'greylist' }).verdict, 'defer')
  assert.equal(decide({ dmarc: 'none' }, { action: 'reject' }).verdict, 'reject')
})

// --- full SMTP conversations ------------------------------------------------------------------
test('accepts mail for a hosted address and hands it to easonet intact', async () => {
  const msg = raw('hello@shop.test')
  const info = await transport.sendMail({ envelope: { from: 'customer@example.net', to: ['hello@shop.test'] }, raw: msg })
  assert.deepEqual(info.accepted, ['hello@shop.test'])
  assert.equal(state.ingests.length, 1)
  const ingest = state.ingests[0]
  assert.deepEqual(ingest.rcptTo, ['hello@shop.test'])
  assert.equal(ingest.mailFrom, 'customer@example.net')
  const uploaded = state.uploads.get(ingest.path)
  assert.ok(uploaded, 'raw message was uploaded before ingest')
  assert.equal(createHash('sha256').update(uploaded).digest('hex'), ingest.sha256)
  assert.match(uploaded.toString(), /Do you ship to Perth\?/)
  assert.equal(state.badSignatures, 0)
})

test('plus tags and postmaster are accepted', async () => {
  const info = await transport.sendMail({
    envelope: { from: 'customer@example.net', to: ['orders+xmas@shop.test', 'postmaster@shop.test'] },
    raw: raw('orders+xmas@shop.test'),
  })
  assert.equal(info.accepted.length, 2)
  assert.deepEqual(state.ingests[0].rcptTo, ['orders+xmas@shop.test', 'postmaster@shop.test'])
})

test('unknown users are rejected during RCPT, known ones still delivered', async () => {
  const info = await transport.sendMail({
    envelope: { from: 'customer@example.net', to: ['hello@shop.test', 'nobody@shop.test'] },
    raw: raw('hello@shop.test'),
  })
  assert.deepEqual(info.accepted, ['hello@shop.test'])
  assert.deepEqual(info.rejected, ['nobody@shop.test'])
  assert.deepEqual(state.ingests[0].rcptTo, ['hello@shop.test'])
})

test('never relays to domains we do not host', async () => {
  await assert.rejects(
    transport.sendMail({ envelope: { from: 'customer@example.net', to: ['someone@gmail.test'] }, raw: raw('someone@gmail.test') }),
    err => err.responseCode === 550 && /Relaying denied/.test(err.response),
  )
  assert.equal(state.ingests.length, 0)
})

test('if easonet fails to store, the sender is told to retry (451), not accepted', async () => {
  state.ingestStatus = 500
  await assert.rejects(
    transport.sendMail({ envelope: { from: 'customer@example.net', to: ['hello@shop.test'] }, raw: raw('hello@shop.test') }),
    err => err.responseCode === 451,
  )
  assert.equal(state.ingests.length, 1)
})

test('a retried delivery carries the same checksum (easonet dedupes on it)', async () => {
  const msg = raw('hello@shop.test')
  state.ingestStatus = 500
  await assert.rejects(transport.sendMail({ envelope: { from: 'customer@example.net', to: ['hello@shop.test'] }, raw: msg }))
  state.ingestStatus = 200
  await transport.sendMail({ envelope: { from: 'customer@example.net', to: ['hello@shop.test'] }, raw: msg })
  assert.equal(state.ingests.length, 2)
  assert.equal(state.ingests[0].sha256, state.ingests[1].sha256)
})

test('oversize messages are refused with 552', async () => {
  await assert.rejects(
    transport.sendMail({ envelope: { from: 'customer@example.net', to: ['hello@shop.test'] }, raw: raw('hello@shop.test', 'x'.repeat(300_000)) }),
    err => err.responseCode === 552,
  )
  assert.equal(state.ingests.length, 0)
})
