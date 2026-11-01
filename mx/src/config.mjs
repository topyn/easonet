import os from 'node:os'

// All settings come from the environment (see .env.example). Fails fast on anything missing
// so a misconfigured server never starts accepting mail it can't deliver.

function required(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var ${name}`)
  return v
}

export function loadConfig(env = process.env) {
  const secret = env.MAIL_HMAC_SECRET || required('MAIL_HMAC_SECRET')
  if (secret.length < 32) throw new Error('MAIL_HMAC_SECRET must be at least 32 characters')
  return {
    hostname: env.MX_HOSTNAME || os.hostname(),          // e.g. mx1.easonet.com — used in banner + HELO checks
    port: Number(env.SMTP_PORT || 25),
    healthPort: Number(env.HEALTH_PORT || 8025),
    easonetUrl: (env.EASONET_URL || required('EASONET_URL')).replace(/\/$/, ''),
    secret,
    maxMessageBytes: Number(env.MAX_MESSAGE_BYTES || 25 * 1024 * 1024),
    maxRecipients: Number(env.MAX_RECIPIENTS || 50),
    maxClients: Number(env.MAX_CLIENTS || 20),          // concurrent SMTP sessions (1 GB box)
    addressRefreshMs: Number(env.ADDRESS_REFRESH_MS || 60_000),
    tlsKeyPath: env.TLS_KEY_PATH || '',
    tlsCertPath: env.TLS_CERT_PATH || '',
    rspamdUrl: (env.RSPAMD_URL || '').replace(/\/$/, ''), // optional, e.g. http://rspamd:11333
    connectionsPerMinutePerIp: Number(env.CONN_PER_MIN_PER_IP || 30),
  }
}
