/**
 * Optional Cloudflare Worker CORS + cookie proxy for production.
 *
 * Deploy (example):
 *   wrangler deploy workers/zilmoney-proxy.js --name work-timer-zilmoney-proxy
 *
 * Then build Work Timer with:
 *   VITE_ZILMONEY_API_BASE=https://work-timer-zilmoney-proxy.<your-subdomain>.workers.dev/zilmoney-api
 *
 * Routes:
 *   /zilmoney-api/*  →  https://api.hr.zilmoney.com/api/*
 *
 * ZilMoney uses cookie sessions (withCredentials), so this worker:
 * - allows CORS with credentials
 * - rewrites Set-Cookie Domain/Path for the worker origin
 */

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin === '*' ? '*' : origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      request.headers.get('Access-Control-Request-Headers') ||
      'Authorization,Content-Type,Accept',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }
}

function rewriteSetCookie(cookie, workerHost) {
  return cookie
    .replace(/;\s*Domain=[^;]*/gi, `; Domain=${workerHost}`)
    .replace(/;\s*Path=\/api/gi, '; Path=/zilmoney-api')
    .replace(/;\s*Path=\//gi, '; Path=/zilmoney-api')
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)
    if (!url.pathname.startsWith('/zilmoney-api')) {
      return new Response('Not found', { status: 404, headers: corsHeaders(request) })
    }

    const targetPath = url.pathname.replace(/^\/zilmoney-api/, '/api') + url.search
    const target = new URL(targetPath, 'https://api.hr.zilmoney.com')

    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.set('Accept', headers.get('Accept') || 'application/json')

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : request.body,
      redirect: 'manual',
    })

    const responseHeaders = new Headers(upstream.headers)
    const setCookies = upstream.headers.getSetCookie?.() || []
    if (setCookies.length) {
      responseHeaders.delete('set-cookie')
      for (const cookie of setCookies) {
        responseHeaders.append(
          'set-cookie',
          rewriteSetCookie(cookie, url.hostname),
        )
      }
    }

    const cors = corsHeaders(request)
    for (const [key, value] of Object.entries(cors)) {
      responseHeaders.set(key, value)
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  },
}
