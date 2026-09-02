import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function rewriteUpstreamCookies(proxyRes) {
  const raw = proxyRes.headers['set-cookie']
  if (!raw) return

  const cookies = Array.isArray(raw) ? raw : [raw]
  proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
    cookie
      // Browser talks to localhost, not api.hr.zilmoney.com
      .replace(/;\s*Domain=[^;]*/gi, '')
      // Cookie path must match the Vite proxy prefix
      .replace(/;\s*Path=\/api/gi, '; Path=/zilmoney-api')
      .replace(/;\s*Path=\//gi, '; Path=/zilmoney-api')
      // http://localhost cannot store Secure cookies
      .replace(/;\s*Secure/gi, '')
      // Same-origin proxy works with Lax
      .replace(/;\s*SameSite=None/gi, '; SameSite=Lax'),
  )
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Avoid browser CORS by proxying ZilMoney ATS through the Vite dev server.
      // Auth is cookie-based; rewrite Set-Cookie so the session sticks on localhost.
      '/zilmoney-api': {
        target: 'https://api.hr.zilmoney.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/zilmoney-api/, '/api'),
        cookieDomainRewrite: '',
        configure: (proxy) => {
          proxy.on('proxyRes', rewriteUpstreamCookies)
        },
      },
    },
  },
  preview: {
    proxy: {
      '/zilmoney-api': {
        target: 'https://api.hr.zilmoney.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/zilmoney-api/, '/api'),
        cookieDomainRewrite: '',
        configure: (proxy) => {
          proxy.on('proxyRes', rewriteUpstreamCookies)
        },
      },
    },
  },
})
