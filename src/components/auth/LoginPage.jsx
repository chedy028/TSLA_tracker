import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SocialButtons } from './SocialButtons'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../i18n/LanguageContext'

function sanitizeNextPath(nextPath, fallback = '/dashboard') {
  if (typeof nextPath !== 'string' || nextPath.length === 0) return fallback
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return fallback
  return nextPath
}

export function LoginPage() {
  const [error, setError] = useState(null)
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const requestedNext = sanitizeNextPath(params.get('next'), '')
  const fromState = sanitizeNextPath(location.state?.from?.pathname || '', '/dashboard')
  const from = requestedNext || fromState

  useEffect(() => {
    // If already logged in, redirect
    if (user && !loading) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from])

  useEffect(() => {
    if (location.state?.reason === 'auth_required') {
      setError(t('paymentErrors.authRequired'))
    }
  }, [location.state, t])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">
          <div className="loading-spinner" />
          <p>{t('auth.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">T</span>
          </div>
          <h1>{t('auth.title')}</h1>
          <p>{t('auth.subtitle')}</p>
        </div>

        {error && (
          <div className="auth-error">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div className="auth-error-content">
              <span>{error}</span>
              {error.includes('date') || error.includes('security') ? (
                <small>{t('auth.dateTimeHint')}</small>
              ) : null}
            </div>
          </div>
        )}

        <SocialButtons onError={setError} nextPath={from} />

        <div className="auth-divider">
          <span>{t('auth.secureAuth')}</span>
        </div>

        <div className="auth-features">
          <h3>{t('auth.proIncludesTitle')}</h3>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {t('auth.featureOne')}
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {t('auth.featureTwo')}
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {t('auth.featureThree')}
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              {t('auth.featureFour')}
            </li>
          </ul>
        </div>

        <div className="auth-footer">
          <p>
            {t('auth.termsPrefix')}{' '}
            <a href="/terms">{t('auth.termsLink')}</a>{' '}
            {t('auth.termsConnector')}{' '}
            <a href="/privacy">{t('auth.privacyLink')}</a>
          </p>
        </div>
      </div>
    </div>
  )
}
