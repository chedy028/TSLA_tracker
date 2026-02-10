import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SocialButtons } from './SocialButtons'
import { useAuth } from '../../hooks/useAuth'

export function LoginPage() {
  const [error, setError] = useState(null)
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the redirect destination from state or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    // If already logged in, redirect
    if (user && !loading) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">
          <div className="loading-spinner" />
          <p>Loading...</p>
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
          <h1>Welcome to TSLA Tracker</h1>
          <p>Sign in to access live stock tracking, AI insights, and email alerts</p>
        </div>

        {error && (
          <div className="auth-error">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div className="auth-error-content">
              <span>{error}</span>
              {error.includes('date') || error.includes('security') ? (
                <small>Check your computer's date and time settings</small>
              ) : null}
            </div>
          </div>
        )}

        <SocialButtons onError={setError} />

        <div className="auth-divider">
          <span>Secure authentication powered by Supabase</span>
        </div>

        <div className="auth-features">
          <h3>Pro membership includes:</h3>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Real-time TSLA price tracking
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              AI-powered valuation analysis
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Price and valuation email alerts
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              AI assistant for guidance
            </li>
          </ul>
        </div>

        <div className="auth-footer">
          <p>
            By signing in, you agree to our{' '}
            <a href="/terms">Terms of Service</a> and{' '}
            <a href="/privacy">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
