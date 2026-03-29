import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { t } = useTranslation()
  const { login, user } = useAuth()
  const navigate = useNavigate()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Bug 1: navigate AFTER React has committed user state — useEffect fires post-commit.
  // This replaces the unreliable synchronous navigate() call right after login().
  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await login(phone, password)
    setLoading(false)
    if (err) {
      setError(err)
    }
    // Navigation is handled by the useEffect above once user state is committed
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="card p-8 w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">{t('app.name')}</h1>
          <p className="text-text-secondary text-sm mt-1">{t('app.tagline')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="input-label">{t('auth.phone')}</label>
            <input
              type="tel"
              className="input-field"
              placeholder="9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="input-label">{t('auth.password')}</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.loginButton')}
          </button>
        </form>
      </div>
      <p className="text-text-secondary text-xs mt-6">CafeOS v1.0 · Unlimited Food Works</p>
    </div>
  )
}
