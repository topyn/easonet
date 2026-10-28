import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { sendFromIdentity } from '../../../lib/mailer'
import { escapeHtml } from '../../../lib/html'
import { capturePayPalOrder, getPayPalOrder, verifyPaid } from '../../../lib/paypal'
import { z } from 'zod'

const CaptureSchema = z.object({
  orderId: z.string(),
  paypalOrderId: z.string(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  const parsed = CaptureSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { orderId, paypalOrderId } = parsed.data

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      store: { include: { identity: true } },
    },
  })
  // The PayPal order must be the one create.ts made for *this* order - otherwise a cheap
  // payment could be replayed against an expensive order.
  if (!order || !order.paypalOrderId || order.paypalOrderId !== paypalOrderId) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const deliveryPayload = {
    ok: true,
    product: {
      name: order.product.name,
      type: order.product.type,
      fileUrl: order.product.fileUrl,
      deliveryNote: order.product.deliveryNote,
    },
  }

  // Already settled by an earlier request - answer the same way, but don't re-capture or re-email.
  if (order.status === 'paid') return res.json(deliveryPayload)
  if (order.status !== 'pending') return res.status(400).json({ error: 'Order cannot be paid' })

  try {
    let paypalData = await capturePayPalOrder(paypalOrderId)
    // A double-submit or retry gets ORDER_ALREADY_CAPTURED - check the order's real state instead.
    if (paypalData?.status !== 'COMPLETED') paypalData = await getPayPalOrder(paypalOrderId)

    if (!verifyPaid(paypalData, order.total, order.currency)) {
      console.error('CAPTURE VERIFY FAILED:', orderId, paypalOrderId, paypalData?.status)
      return res.status(400).json({ error: 'Payment not completed' })
    }

    // Atomic pending -> paid: only the request that wins this takes the stock and sends the emails.
    const claimed = await prisma.$transaction(async tx => {
      const won = await tx.order.updateMany({
        where: { id: orderId, status: 'pending' },
        data: { status: 'paid' },
      })
      if (won.count === 1) {
        // Untracked stock (null) is left alone. The buyer has already paid, so this may go
        // below zero on a race - the seller sees it and refunds rather than losing the sale.
        await tx.product.updateMany({
          where: { id: order.productId, stock: { not: null } },
          data: { stock: { decrement: order.quantity } },
        })
      }
      return won.count === 1
    })
    if (!claimed) return res.json(deliveryPayload)

    if (order.store.identity) {
      const deliveryText = order.product.type === 'digital'
        ? `\n\nYour download:\n${order.product.fileUrl || order.product.deliveryNote || 'We will send your download link shortly.'}`
        : `\n\nWe will ship your order shortly.`

      await sendFromIdentity({
        identity: order.store.identity,
        to: order.buyerEmail,
        subject: `Order confirmed — ${order.product.name}`,
        text: `Hi ${order.buyerName},\n\nThank you for your order!\n\n${order.product.name} x${order.quantity} — $${order.total} ${order.currency}${deliveryText}\n\nThank you,\n${order.store.name}`,
      })

      const orderHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#101010;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 36px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#7B6EF6;letter-spacing:.1em;text-transform:uppercase;font-family:monospace;">// new order</p>
          <h1 style="margin:12px 0 0;font-size:24px;font-weight:800;color:#f0f0ee;letter-spacing:-1px;">${escapeHtml(order.store.name)}</h1>
        </td></tr>
        <tr><td style="padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;color:#444;font-family:monospace;text-transform:uppercase;letter-spacing:.08em;">Product</p>
                <p style="margin:0;font-size:15px;color:#f0f0ee;font-weight:600;">${escapeHtml(order.product.name)}</p>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;color:#444;font-family:monospace;text-transform:uppercase;letter-spacing:.08em;">Total</p>
                <p style="margin:0;font-size:22px;color:#7B6EF6;font-weight:800;letter-spacing:-1px;">$\${order.total.toFixed(2)}</p>
              </td>
              <td width="50%" style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;color:#444;font-family:monospace;text-transform:uppercase;letter-spacing:.08em;">Quantity</p>
                <p style="margin:0;font-size:15px;color:#f0f0ee;font-weight:600;">${order.quantity}</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 12px;font-size:11px;color:#444;font-family:monospace;text-transform:uppercase;letter-spacing:.08em;">Buyer</p>
          <p style="margin:0 0 4px;font-size:15px;color:#f0f0ee;font-weight:600;">${escapeHtml(order.buyerName)}</p>
          <p style="margin:0;font-size:13px;color:#666;">${escapeHtml(order.buyerEmail)}</p>
          ${order.buyerAddress ? `<p style="margin:8px 0 0;font-size:13px;color:#666;">${escapeHtml(order.buyerAddress)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:20px 36px;">
          <p style="margin:0;font-size:12px;color:#333;font-family:monospace;">// powered by easonet</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      await sendFromIdentity({
        identity: order.store.identity,
        to: order.store.identity.email,
        subject: `New order: ${order.product.name} — $${order.total.toFixed(2)}`,
        text: `New order!\n\nProduct: ${order.product.name}\nQty: ${order.quantity}\nTotal: $${order.total.toFixed(2)}\n\nBuyer: ${order.buyerName} (${order.buyerEmail})${order.buyerAddress ? `\nAddress: ${order.buyerAddress}` : ''}`,
        html: orderHtml,
      })
    }

    return res.json(deliveryPayload)
  } catch (err: any) {
    console.error('CAPTURE ERROR:', err.message)
    return res.status(500).json({ error: 'Failed to capture payment' })
  }
}
