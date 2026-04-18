import { useState, useEffect, useSyncExternalStore } from 'react'
import { getStoredAuth, clearStoredAuth } from './auth'
import { Login } from './pages/Login'
import { Users } from './pages/Users'
import { UserDetail } from './pages/UserDetail'

function getHash() {
  return window.location.hash || '#/'
}

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

function useHash() {
  return useSyncExternalStore(subscribeHash, getHash)
}

export function App() {
  const [authed, setAuthed] = useState(() => !!getStoredAuth().token)
  const hash = useHash()

  useEffect(() => {
    if (!authed && hash !== '#/login') {
      window.location.hash = '#/login'
    }
  }, [authed, hash])

  if (!authed || hash === '#/login') {
    return <Login onLogin={() => { setAuthed(true); window.location.hash = '#/' }} />
  }

  const userMatch = hash.match(/^#\/users\/(.+)$/)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="#/" className="text-base font-semibold text-gray-900">🍉 Melodoro Admin</a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{getStoredAuth().email}</span>
            <button
              onClick={() => { clearStoredAuth(); setAuthed(false) }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              退出
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {userMatch ? <UserDetail userId={userMatch[1]} /> : <Users />}
      </main>
    </div>
  )
}
