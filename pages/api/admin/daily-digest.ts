import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { sendFromIdentity } from '../../../lib/mailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Protect with a secret so only Vercel cron or manual trigger can call it
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // Gather all stats
    const [
      newUsers,
      totalUsers,
      newOrders,
      newWaitlistSignups,
      newBrandPages,
      newThreads,
      recentErrors,
      totalOrders,
      totalSignups,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: yesterday } },
        select: { email: true, plan: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
      prisma.order.findMany({
        where: { createdAt: { gte: yesterday }, status: 'paid' },
        include: { product: { select: { name: true } }, store: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.waitlistSignup.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.brandPage.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.thread.count({ where: { createdAt: { gte: yesterday } } }),
      // Error log — last 24hrs (if table exists)
      Promise.resolve([]),
      prisma.order.count({ where: { status: 'paid' } }),
      prisma.waitlistSignup.count(),
    ])

    const revenue24h = newOrders.reduce((sum, o) => sum + o.total, 0)

    // Build HTML email
    const date = now.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td style="padding:0 0 24px;">
          <p style="margin:0;font-size:11px;color:#7B6EF6;letter-spacing:.1em;text-transform:uppercase;font-family:monospace;">// daily digest</p>
          <h1 style="margin:10px 0 4px;font-size:28px;font-weight:800;color:#f0f0ee;letter-spacing:-1px;">${date}</h1>
          <p style="margin:0;font-size:13px;color:#555;">Your easonet platform summary for the last 24 hours.</p>
        </td></tr>

        <!-- Stats grid -->
        <tr><td style="padding:0 0 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${[
                { label: 'New users', value: newUsers.length, color: '#7B6EF6' },
                { label: 'Total users', value: totalUsers, color: '#3ECF8E' },
                { label: 'New orders', value: newOrders.length, color: '#F5A623' },
                { label: 'Revenue (24h)', value: `$${revenue24h.toFixed(2)}`, color: '#60A5FA' },
              ].map(s => `
              <td width="25%" style="padding:0 6px 0 0;">
                <div style="background:#101010;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:10px;color:#444;font-family:monospace;text-transform:uppercase;letter-spacing:.08em;">${s.label}</p>
                  <p style="margin:0;font-size:28px;font-weight:800;color:${s.color};letter-spacing:-1px;">${s.value}</p>
                </div>
              </td>`).join('')}
            </tr>
          </table>
        </td></tr>

        <!-- Second row stats -->
        <tr><td style="padding:0 0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${[
                { label: 'Waitlist signups (24h)', value: newWaitlistSignups, color: '#A78BFA' },
                { label: 'Total signups', value: totalSignups, color: '#A78BFA' },
                { label: 'Brand pages created', value: newBrandPages, color: '#34D399' },
                { label: 'Email threads', value: newThreads, color: '#60A5FA' },
              ].map(s => `
              <td width="25%" style="padding:0 6px 0 0;">
                <div style="background:#101010;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:10px;color:#444;font-family:monospace;text-transform:uppercase;letter-spacing:.08em;">${s.label}</p>
                  <p style="margin:0;font-size:28px;font-weight:800;color:${s.color};letter-spacing:-1px;">${s.value}</p>
                </div>
              </td>`).join('')}
            </tr>
          </table>
        </td></tr>

        ${newUsers.length > 0 ? `
        <!-- New users -->
        <tr><td style="padding:0 0 20px;">
          <div style="background:#101010;border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden;">
            <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);">
              <p style="margin:0;font-size:11px;color:#7B6EF6;font-family:monospace;text-transform:uppercase;letter-spacing:.1em;">// new signups today</p>
            </div>
            ${newUsers.map(u => `
            <div style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,.04);">
              <p style="margin:0;font-size:14px;color:#f0f0ee;">${u.email}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#444;font-family:monospace;">plan: ${u.plan} · signed up ${new Date(u.createdAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>`).join('')}
          </div>
        </td></tr>` : ''}

        ${newOrders.length > 0 ? `
        <!-- New orders -->
        <tr><td style="padding:0 0 20px;">
          <div style="background:#101010;border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden;">
            <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);">
              <p style="margin:0;font-size:11px;color:#F5A623;font-family:monospace;text-transform:uppercase;letter-spacing:.1em;">// orders today</p>
            </div>
            ${newOrders.map(o => `
            <div style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;justify-content:space-between;">
              <div>
                <p style="margin:0;font-size:14px;color:#f0f0ee;">${o.product.name}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#444;font-family:monospace;">${o.store.name}</p>
              </div>
              <p style="margin:0;font-size:16px;font-weight:700;color:#F5A623;">$${o.total.toFixed(2)}</p>
            </div>`).join('')}
            <div style="padding:12px 20px;background:rgba(245,166,35,.06);">
              <p style="margin:0;font-size:13px;color:#F5A623;font-weight:600;">Total: $${revenue24h.toFixed(2)}</p>
            </div>
          </div>
        </td></tr>` : ''}

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;">
          <p style="margin:0;font-size:12px;color:#333;font-family:monospace;">// easonet admin digest · sent daily at 7am</p>
          <p style="margin:6px 0 0;font-size:12px;color:#333;font-family:monospace;"><a href="https://easonet.com/app" style="color:#7B6EF6;">Open dashboard →</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    const text = `Easonet Daily Digest — ${date}

New users: ${newUsers.length}
Total users: ${totalUsers}
New orders: ${newOrders.length}
Revenue (24h): $${revenue24h.toFixed(2)}
Waitlist signups: ${newWaitlistSignups}
Brand pages created: ${newBrandPages}
Email threads: ${newThreads}

${newUsers.length > 0 ? `New signups:\n${newUsers.map(u => `  ${u.email} (${u.plan})`).join('\n')}\n` : ''}
${newOrders.length > 0 ? `Orders:\n${newOrders.map(o => `  ${o.product.name} — $${o.total.toFixed(2)}`).join('\n')}\n` : ''}

Open dashboard: https://easonet.com/app`

    // Get the easonet identity to send from
    const identity = await prisma.identity.findFirst({
      where: { email: 'mark@easonet.com' },
    })

    if (!identity) {
      return res.status(500).json({ error: 'No sending identity found' })
    }

    await sendFromIdentity({
      identity,
      to: 'mhbarnett@yahoo.com',
      subject: `Easonet digest — ${newUsers.length} new users, $${revenue24h.toFixed(2)} revenue`,
      text,
      html,
    })

    return res.json({
      ok: true,
      sent: true,
      stats: { newUsers: newUsers.length, totalUsers, newOrders: newOrders.length, revenue24h, newWaitlistSignups, newBrandPages, newThreads },
    })
  } catch (err: any) {
    console.error('DIGEST ERROR:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
