// /llms.txt and Markdown pages for AI agents (lib/agent.ts). next.config.js rewrites:
//   /llms.txt                               → /api/agent/llms
//   any page with Accept: text/markdown     → /api/agent/markdown?path=<page>

import type { NextApiRequest, NextApiResponse } from 'next'
import { agentMarkdown, llmsTxt } from '../../../lib/agent'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.query.file === 'llms') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.send(llmsTxt())
  }
  if (req.query.file === 'markdown') {
    const page = agentMarkdown(String(req.query.path || '/'))
    res.statusCode = page.status
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    // The same URL serves HTML to browsers: never let a cached Markdown copy reach them.
    res.setHeader('Vary', 'Accept')
    res.setHeader('Cache-Control', 'private, no-store')
    return res.end(page.body)
  }
  return res.status(404).end()
}
