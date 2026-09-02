import { useEffect, useState } from 'react'
import {
  ensureAtsSession,
  getAtsAuth,
  subscribeAtsAuth,
} from '../utils/zilmoneyApi'

/** Live ATS session for header / modal (name, email, signed-in state). */
export function useAtsAuth({ refreshOnMount = false } = {}) {
  const [auth, setAuth] = useState(() => getAtsAuth())

  useEffect(() => {
    return subscribeAtsAuth(setAuth)
  }, [])

  useEffect(() => {
    if (!refreshOnMount) return undefined
    let cancelled = false
    ;(async () => {
      const next = await ensureAtsSession()
      if (!cancelled) setAuth(next)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshOnMount])

  return auth
}
