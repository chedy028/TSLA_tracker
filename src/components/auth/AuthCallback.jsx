import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function AuthCallback() {
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('Processing...')
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!supabase) {
          throw new Error('Authentication is not configured. Please check environment variables.')
        }

        // Get URL parameters
        const url = new URL(window.location.href)
        const authCode = url.searchParams.get('code')
        const errorParam = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')

        // Check for OAuth error in URL
        if (errorParam) {
          throw new Error(errorDescription || errorParam)
        }

        console.log('Auth callback - code present:', !!authCode)
        setStatus('Exchanging auth code...')

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
          setStatus('Checking session...')
          const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Session error:', sessionError)
            throw sessionError
          }
          
          session = existingSession
        }
        
        if (session) {
          setStatus('Success! Redirecting...')
          // Small delay to show success message
          setTimeout(() => {
            navigate('/dashboard', { replace: true })
          }, 500)
        } else {
          // No session obtained, redirect to login
          console.log('No session obtained, redirecting to login')
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err.message || 'Authentication failed')
        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 3000)
      }
    }

    // Add a timeout in case something hangs
    const timeoutId = setTimeout(() => {
      console.error('Auth callback timeout')
      setError('Authentication timed out. Please try again.')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    }, 15000) // 15 second timeout

    handleCallback().finally(() => {
      clearTimeout(timeoutId)
    })

    return () => clearTimeout(timeoutId)
  }, [navigate])

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-error">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h2>Authentication Error</h2>
            <p>{error}</p>
            <p className="redirect-notice">Redirecting to login...</p>
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
          <p>{status}</p>
        </div>
      </div>
    </div>
  )
}






