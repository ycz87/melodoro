/**
 * useAuth — authentication state management hook
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const AUTH_BASE = 'https://auth.cosmelon.app'
export const API_BASE = 'https://api.clock.cosmelon.app' // for future business API calls
const TOKEN_KEY = 'wc_access_token'

export interface User {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const scheduleRefresh = useCallback((token: string) => {
    function scheduleTokenRefresh(nextToken: string) {
      try {
        const payload = JSON.parse(atob(nextToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        const expiresIn = payload.exp * 1000 - Date.now()
        // Refresh 1 minute before expiry
        const refreshIn = Math.max(expiresIn - 60_000, 10_000)
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(async () => {
          try {
            const res = await fetch(`${AUTH_BASE}/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
            })
            if (res.ok) {
              const data = await res.json() as { accessToken: string }
              localStorage.setItem(TOKEN_KEY, data.accessToken)
              scheduleTokenRefresh(data.accessToken)
            } else {
              clearAuth()
            }
          } catch {
            clearAuth()
          }
        }, refreshIn)
      } catch {
        // Invalid token format
        clearAuth()
      }
    }

    scheduleTokenRefresh(token)
  }, [clearAuth])

  const fetchMe = useCallback(async (token: string): Promise<User | null> => {
    try {
      const res = await fetch(`${AUTH_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      const data = await res.json() as { user: User }
      return data.user
    } catch {
      return null
    }
  }, [])

  // Initialize: check token + fetch user
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // Check URL fragment for OAuth callback
      const hash = window.location.hash
      if (hash.includes('access_token=')) {
        const token = hash.split('access_token=')[1]?.split('&')[0]
        if (token) {
          localStorage.setItem(TOKEN_KEY, token)
          // Clean URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      }

      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        if (!cancelled) setIsLoading(false)
        return
      }

      const me = await fetchMe(token)
      if (cancelled) return
      if (me) {
        if (!cancelled) setUser(me)
        scheduleRefresh(token)
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
      if (!cancelled) setIsLoading(false)
    }

    init()

    return () => {
      cancelled = true
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [fetchMe, scheduleRefresh])

  const login = useCallback(async (accessToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    const me = await fetchMe(accessToken)
    if (me) {
      setUser(me)
      scheduleRefresh(accessToken)
    }
  }, [fetchMe, scheduleRefresh])

  const logout = useCallback(async () => {
    try {
      await fetch(`${AUTH_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Best effort
    }
    clearAuth()
  }, [clearAuth])

  const updateProfile = useCallback((data: { displayName?: string; avatarUrl?: string }) => {
    setUser(prev => prev ? { ...prev, ...data } : null)
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
  }
}
