/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // AI agents (lib/agent.ts): Markdown for anyone sending Accept: text/markdown — browsers
    // never do — and the generated llms.txt.
    const wantsMarkdown = [{ type: 'header', key: 'accept', value: '(.*)text/markdown(.*)' }]
    const pages = ['/', '/features', '/pricing', '/register', '/privacy']
    return {
      beforeFiles: pages.map(p => ({ source: p, has: wantsMarkdown, destination: `/api/agent/markdown?path=${p}` })),
      afterFiles: [{ source: '/llms.txt', destination: '/api/agent/llms' }],
      // Unknown paths asked for as Markdown get a Markdown 404.
      fallback: [{ source: '/:path*', has: wantsMarkdown, destination: '/api/agent/markdown?path=/:path*' }],
    }
  },
}
module.exports = nextConfig
