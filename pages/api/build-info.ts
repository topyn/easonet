import type { NextApiRequest, NextApiResponse } from 'next'

// Vercel sets this automatically for every deployment, no config needed. The client
// polls this to detect when a new version has gone live while a tab is still running
// an old bundle - which silently misses any client-side bugfix shipped since it loaded.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ commit: process.env.VERCEL_GIT_COMMIT_SHA || null })
}
