import http from 'node:http'
import { loadConfig } from './config.mjs'
import { createEasonetClient } from './easonet.mjs'
import { createAddressBook } from './addresses.mjs'
import { createMxServer } from './server.mjs'

const config = loadConfig()
const client = createEasonetClient(config)
const addressBook = createAddressBook({ client, refreshMs: config.addressRefreshMs })
await addressBook.start()

const mx = createMxServer({ config, client, addressBook })
mx.smtp.listen(config.port, () => console.log(`[mx] ${config.hostname} listening on :${config.port}`))

// Health for the uptime monitor: 503 when the address list is stale (easonet unreachable for
// 10+ minutes) — mail is still accepted from the last good list, but someone should look.
const health = http.createServer((_req, res) => {
  const ageSec = Math.round(addressBook.ageMs() / 1000)
  const ok = addressBook.isReady() && ageSec < 600
  res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ ok, host: config.hostname, addressListAgeSec: Number.isFinite(ageSec) ? ageSec : null }))
})
health.listen(config.healthPort, () => console.log(`[mx] health on :${config.healthPort}`))

// certbot's deploy hook sends SIGHUP after renewing the certificate.
process.on('SIGHUP', () => console.log(`[tls] reload ${mx.reloadTls() ? 'ok' : 'failed'}`))

function shutdown() {
  console.log('[mx] shutting down')
  addressBook.stop()
  health.close()
  mx.smtp.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 30_000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
