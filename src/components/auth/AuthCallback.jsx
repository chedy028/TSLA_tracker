import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../i18n/LanguageContext'

function sanitizeNextPath(nextPath, fallback = '/dashboard') {
  if (typeof nextPath !== 'string' || nextPath.length === 0) return fallback
  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return fallback
  return nextPath
}

export function AuthCallback() {
  const [error, setError] = useState(null)
  const { t } = useLanguage()
  const [statusKey, setStatusKey] = useState('auth.callbackProcessing')
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = typeof location.state?.from?.pathname === 'string'
    ? location.state.from.pathname
    : ''

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!supabase) {
          throw new Error('auth.notConfigured')
        }

        // Get URL parameters
        const url = new URL(window.location.href)
        const authCode = url.searchParams.get('code')
        const errorParam = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')
        const nextFromQuery = sanitizeNextPath(url.searchParams.get('next'), '')
        const nextFromState = sanitizeNextPath(fromPath, '/dashboard')
        const redirectTarget = nextFromQuery || nextFromState

        // Check for OAuth error in URL
        if (errorParam) {
          throw new Error(errorDescription || errorParam)
        }

        console.log('Auth callback - code present:', !!authCode)
        setStatusKey('auth.callbackExchangeCode')

        let session = null

        if (authCode) {
          // PKCE flow: exchange the code for session
          // Pass just the code string, not the full URL
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode)
          
          if (exchangeError) {
            console.error('Exchange error:', exchangeError)
            throw exchangeError
          }
          
          session = data?.session
          console.log('Session obtained:', !!session)
        } else {
          // Fallback: check if session already exists (implicit flow or already authenticated)
          setStatusKey('auth.callbackCheckSession')
          const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Session error:', sessionError)
            throw sessionError
          }
          
          session = existingSession
        }
        
        if (session) {
          setStatusKey('auth.callbackSuccessRedirect')
          // Small delay to show success message
          setTimeout(() => {
            navigate(redirectTarget, { replace: true })
          }, 500)
        } else {
          // No session obtained, redirect to login
          console.log('No session obtained, redirecting to login')
          navigate(`/login?next=${encodeURIComponent(redirectTarget)}`, { replace: true })
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err.message || 'auth.callbackFailed')
        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 3000)
      }
    }

    // Add a timeout in case something hangs
    const timeoutId = setTimeout(() => {
      console.error('Auth callback timeout')
      setError('auth.callbackTimeout')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    }, 15000) // 15 second timeout

    handleCallback().finally(() => {
      clearTimeout(timeoutId)
    })

    return () => clearTimeout(timeoutId)
  }, [navigate, fromPath])

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-error">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h2>{t('auth.callbackErrorTitle')}</h2>
            <p>{error?.startsWith('auth.') ? t(error) : error}</p>
            <p className="redirect-notice">{t('auth.callbackRedirecting')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-loading">
          <div className="loading-spinner" />
          <p>{t(statusKey)}</p>
        </div>
      </div>
    </div>
  )
}



