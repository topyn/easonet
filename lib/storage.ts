import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabase } from './supabase-server'

export const ATTACHMENTS_BUCKET = 'email-attachments'
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // matches the bucket's file_size_limit

export function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, '_').slice(-150) || 'attachment'
}

export async function uploadAttachment(req: NextApiRequest, res: NextApiResponse, path: string, buffer: Buffer, contentType: string) {
  const supabase = createServerSupabase(req, res)
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, buffer, { contentType, upsert: false })
  if (error) throw error
}

export async function signAttachmentUrl(req: NextApiRequest, res: NextApiResponse, path: string, expiresInSeconds = 300) {
  const supabase = createServerSupabase(req, res)
  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, expiresInSeconds)
  if (error || !data) throw error ?? new Error('Failed to sign attachment URL')
  return data.signedUrl
}
