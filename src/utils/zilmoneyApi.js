import { parseAtsImport } from './atsImport'

/**
 * Same-origin `/zilmoney-api` avoids CORS:
 * - Vite dev: proxied in vite.config.js
 * - Vercel: vercel.json rewrites /zilmoney-api → api.hr.zilmoney.com/api
 *   (plain Vite cannot host /api serverless functions)
 * - Cloudflare Pages: functions/zilmoney-api/[[path]].js
 * Override with VITE_ZILMONEY_API_BASE when needed.
 */
const API_BASE = import.meta.env.VITE_ZILMONEY_API_BASE || '/zilmoney-api'

const AUTH_KEY = 'work-timer:ats-auth:v1'
const EMAIL_KEY = 'work-timer:ats-email:v1'
const NAME_KEY = 'work-timer:ats-name:v1'

const authListeners = new Set()

function notifyAtsAuth() {
  const auth = readAuth()
  authListeners.forEach((listener) => listener(auth))
}

export function subscribeAtsAuth(listener) {
  authListeners.add(listener)
  return () => authListeners.delete(listener)
}

function readAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.session) return null
    return {
      session: true,
      email: parsed.email ? String(parsed.email) : getRememberedEmail(),
      name: parsed.name ? String(parsed.name) : getRememberedName(),
      savedAt: parsed.savedAt ?? null,
    }
  } catch {
    return null
  }
}

function writeAuth(auth) {
  if (!auth?.session) {
    localStorage.removeItem(AUTH_KEY)
    notifyAtsAuth()
    return null
  }
  const email = auth.email ?? ''
  const name = auth.name ?? ''
  if (email) localStorage.setItem(EMAIL_KEY, email)
  if (name) localStorage.setItem(NAME_KEY, name)
  const next = {
    session: true,
    email,
    name,
    savedAt: Date.now(),
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(next))
  notifyAtsAuth()
  return next
}

export function getRememberedEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

export function getRememberedName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export function clearAtsAuth() {
  localStorage.removeItem(AUTH_KEY)
  notifyAtsAuth()
}

export function getAtsAuth() {
  return readAuth()
}

function extractUser(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.user && typeof payload.user === 'object') return payload.user
  if (payload.data?.user && typeof payload.data.user === 'object') {
    return payload.data.user
  }
  // /auth/me often returns the user object directly
  if (payload.email || payload.id || payload.name) return payload
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    if (payload.data.email || payload.data.id || payload.data.name) return payload.data
  }
  return null
}

function emailFromUser(user, fallback = '') {
  if (!user || typeof user !== 'object') return fallback
  return String(user.email || user.username || fallback || '')
}

function nameFromUser(user, fallback = '') {
  if (!user || typeof user !== 'object') return fallback
  const direct =
    user.name ||
    user.full_name ||
    user.fullName ||
    user.display_name ||
    user.displayName ||
    user.employee_name ||
    user.employeeName
  if (direct) return String(direct).trim()

  const first = user.first_name || user.firstName || user.given_name || ''
  const last = user.last_name || user.lastName || user.family_name || ''
  const combined = `${first} ${last}`.trim()
  return combined || fallback
}

async function parseJsonResponse(response) {
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }
  return data
}

function stringifyErrorValue(value) {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    return (
      value.message ||
      value.error ||
      value.detail ||
      value.code ||
      null
    )
  }
  return null
}

function errorMessage(data, fallback) {
  if (!data) return fallback
  if (typeof data === 'string') return data
  return (
    stringifyErrorValue(data.message) ||
    stringifyErrorValue(data.error) ||
    stringifyErrorValue(data.detail) ||
    stringifyErrorValue(data?.errors?.[0]) ||
    (data?.error?.code === 'NOT_FOUND'
      ? 'ATS proxy not found on this host. Redeploy so /zilmoney-api is routed to the Vercel API.'
      : null) ||
    fallback
  )
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = {
    Accept: 'application/json',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error(
      'Could not reach the ATS proxy at /zilmoney-api. Redeploy so Vercel rewrites that path to api.hr.zilmoney.com.',
    )
  }

  const data = await parseJsonResponse(response)

  if (response.status === 401 || response.status === 403) {
    const err = new Error(errorMessage(data, 'ATS login expired. Sign in again.'))
    err.code = 'unauthorized'
    throw err
  }

  if (!response.ok) {
    throw new Error(errorMessage(data, `ATS request failed (${response.status}).`))
  }

  return data
}

/**
 * Soft-renew cookie session the same way hr.zilmoney.com does.
 * Returns auth if cookies are still valid; otherwise null.
 */
export async function ensureAtsSession() {
  try {
    try {
      await apiFetch('/auth/refresh', { method: 'POST' })
    } catch {
      // Refresh can fail while /auth/me still works; keep going.
    }

    const me = await apiFetch('/auth/me')
    const user = extractUser(me)
    if (!user) {
      clearAtsAuth()
      return null
    }

    return writeAuth({
      session: true,
      email: emailFromUser(user, getRememberedEmail()),
      name: nameFromUser(user, getRememberedName()),
    })
  } catch (error) {
    if (error?.code === 'unauthorized') {
      clearAtsAuth()
      return null
    }
    // Network blip: keep local "signed in" hint if we had one
    return readAuth()
  }
}

export async function loginAts({ email, password }) {
  const trimmedEmail = String(email ?? '').trim()
  const trimmedPassword = String(password ?? '')
  if (!trimmedEmail || !trimmedPassword) {
    throw new Error('Enter your ZilMoney email and password.')
  }

  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: { email: trimmedEmail, password: trimmedPassword },
  })

  const user = extractUser(data)
  if (!user) {
    throw new Error('Login succeeded but no user session was returned.')
  }

  // Session cookies are set by the API (via the Vite/worker proxy).
  return writeAuth({
    session: true,
    email: emailFromUser(user, trimmedEmail),
    name: nameFromUser(user, getRememberedName()),
  })
}

export async function logoutAts() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // Local sign-out should still succeed if the network call fails.
  }
  clearAtsAuth()
}

export async function fetchAtsToday() {
  const data = await apiFetch('/attendance/my-today')
  return data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
    ? data.data
    : data
}

export async function triggerAtsSync() {
  return apiFetch('/performance/my-score?period=this_week')
}

export async function fetchAtsSyncStatus() {
  const data = await apiFetch('/attendance/my-sync-status')
  return data?.data && typeof data.data === 'object' ? data.data : data
}

/**
 * Reuse cookie session when possible. Only asks for password on first use
 * or after the ATS session expires.
 */
export async function syncAtsToday({
  email,
  password,
  shift = 'day',
  refreshSync = true,
} = {}) {
  let auth = readAuth()
  const trimmedPassword = String(password ?? '')

  if (trimmedPassword) {
    auth = await loginAts({
      email: email || auth?.email || getRememberedEmail(),
      password: trimmedPassword,
    })
  } else {
    auth = (await ensureAtsSession()) || auth
    if (!auth?.session) {
      const err = new Error('Sign in once with your ZilMoney email and password.')
      err.code = 'unauthorized'
      throw err
    }
  }

  try {
    if (refreshSync) {
      try {
        await triggerAtsSync()
        await fetchAtsSyncStatus()
      } catch {
        // Sync endpoints are helpful but not required to import today's punches.
      }
    }

    const today = await fetchAtsToday()
    const mapped = parseAtsImport(today, { shift })
    if (!mapped.ok) {
      throw new Error(mapped.error || 'Could not map today’s ATS attendance.')
    }

    return {
      ok: true,
      auth,
      raw: today,
      ...mapped,
    }
  } catch (error) {
    if (error?.code === 'unauthorized') {
      clearAtsAuth()
    }
    throw error
  }
}
