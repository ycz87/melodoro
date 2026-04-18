import { useState, useRef } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { sendCode, verifyCode } from '../auth'

const TURNSTILE_SITE_KEY = '0x4AAAAAACbwD0uXjJAIG84Y'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!turnstileToken) {
      setError('请完成人机验证')
      return
    }
    setLoading(true)
    setError('')
    const result = await sendCode(email, turnstileToken)
    setLoading(false)
    if (result.ok) {
      setStep('code')
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    } else {
      setError(result.error || 'Failed to send code')
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await verifyCode(email, code)
    setLoading(false)
    if (result.ok) {
      onLogin()
    } else {
      setError(result.error || 'Verification failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-6 text-center">Melodoro Admin</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode}>
            <label className="block text-sm text-gray-600 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@cosmelon.app"
              required
              autoFocus
            />
            <div className="flex justify-center my-4">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                options={{ theme: 'light' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '发送中...' : '发送验证码'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <p className="text-sm text-gray-500 mb-3">验证码已发送到 {email}</p>
            <label className="block text-sm text-gray-600 mb-1">验证码</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="mt-4 w-full py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '验证中...' : '登录'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              返回
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
