/**
 * Vercel Edge Function — proxies ZilMoney ATS and rewrites session cookies
 * so the browser can call same-origin `/zilmoney-api/*`.
 *
 * Browser path (via vercel.json rewrite): /zilmoney-api/*
 * Function path: /api/zilmoney-api/*
 */

export const config = {
  runtime: 'edge',
}

const UPSTREAM = 'https://api.hr.zilmoney.com'

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

function rewriteSetCookie(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]*/gi, '')
    .replace(/;\s*Path=\/api/gi, '; Path=/zilmoney-api')
    .replace(/;\s*Path=\//gi, '; Path=/zilmoney-api')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  const incoming = new URL(request.url)
  const prefixes = ['/api/zilmoney-api/', '/zilmoney-api/']
  let suffix = incoming.pathname
  for (const prefix of prefixes) {
    if (suffix.startsWith(prefix)) {
      suffix = suffix.slice(prefix.length)
      break
    }
  }
  suffix = suffix.replace(/^\/+/, '')

  const target = new URL(`/api/${suffix}${incoming.search}`, UPSTREAM)

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
      responseHeaders.append('set-cookie', rewriteSetCookie(cookie))
    }
  }

  for (const [key, value] of Object.entries(corsHeaders(request))) {
    responseHeaders.set(key, value)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}
