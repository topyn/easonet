import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/supabase-server'
import { signAttachmentUrl } from '../../../../lib/storage'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  const { id } = req.query

  const attachment = await prisma.attachment.findFirst({
    where: { id: String(id) },
    include: { message: { include: { thread: true } } },
  })

  if (!attachment || attachment.message.thread.userId !== dbUser.id) {
    return res.status(404).json({ error: 'Attachment not found' })
  }

  try {
    const url = await signAttachmentUrl(req, res, attachment.storagePath, 60)
    return res.json({ url, filename: attachment.filename })
  } catch (err) {
    console.error('ATTACHMENT DOWNLOAD ERROR:', err)
    return res.status(500).json({ error: 'Failed to generate download link' })
  }
}
