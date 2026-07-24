import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/supabase-server'
import { uploadAttachment, sanitizeFilename, MAX_ATTACHMENT_BYTES } from '../../../../lib/storage'

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } }

const UploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  dataBase64: z.string().min(1),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  try {
    const authUser = await getUser(req, res)
    if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
    if (!dbUser) return res.status(404).json({ error: 'User not found' })

    const parsed = UploadSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { filename, mimeType, dataBase64 } = parsed.data
    const buffer = Buffer.from(dataBase64, 'base64')
    if (buffer.length === 0) return res.status(400).json({ error: 'Empty file' })
    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      return res.status(400).json({ error: `File too large — max ${Math.floor(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB` })
    }

    const path = `${dbUser.id}/${randomUUID()}-${sanitizeFilename(filename)}`
    await uploadAttachment(req, res, path, buffer, mimeType)

    return res.status(201).json({ path, filename, mimeType, size: buffer.length })
  } catch (err: any) {
    console.error('ATTACHMENT UPLOAD ERROR:', err.message)
    return res.status(500).json({ error: 'Failed to upload attachment' })
  }
}
