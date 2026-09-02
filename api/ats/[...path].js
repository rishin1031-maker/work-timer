/**
 * Vercel Node serverless fallback for /api/ats/*
 * (used when middleware is unavailable; vercel.json rewrites /zilmoney-api → here)
 */

function rewriteSetCookie(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]*/gi, '')
    .replace(/;\s*Path=\/api/gi, '; Path=/zilmoney-api')
    .replace(/;\s*Path=\//gi, '; Path=/zilmoney-api')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*'

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    )
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] ||
        'Authorization,Content-Type,Accept',
    )
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.status(204).end()
    return
  }

  const pathParam = req.query.path
  const suffix = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || ''
  const searchIndex = req.url.indexOf('?')
  const search = searchIndex >= 0 ? req.url.slice(searchIndex) : ''
  const targetUrl = `https://api.hr.zilmoney.com/api/${suffix}${search}`

  const headers = {
    Accept: req.headers.accept || 'application/json',
  }
  if (req.headers.cookie) headers.Cookie = req.headers.cookie
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type']
  }

  let body
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body =
      typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? req.body
        : JSON.stringify(req.body ?? {})
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
  }

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  })

  const setCookies = upstream.headers.getSetCookie?.() || []
  if (setCookies.length) {
    res.setHeader('Set-Cookie', setCookies.map(rewriteSetCookie))
  }

  const contentType = upstream.headers.get('content-type')
  if (contentType) res.setHeader('Content-Type', contentType)

  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
  }

  const text = await upstream.text()
  res.status(upstream.status).send(text)
}
