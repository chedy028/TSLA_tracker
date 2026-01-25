import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase client not initialized. Check your environment variables.')
      setLoading(false)
      return
    }

    // Helper to safely fetch profile (won't throw if profile doesn't exist)
    const safeGetProfile = async (userId) => {
      try {
        const profileData = await getProfile(userId)
        return profileData
      } catch (err) {
        console.warn('Profile fetch failed (may be new user):', err)
        return null
      }
    }

    // Get initial session
    const initAuth = async () => {
      try {
        console.log('Initializing auth...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          throw sessionError
        }
        
        if (session?.user) {
          console.log('User found:', session.user.email)
          setUser(session.user)
          const profileData = await safeGetProfile(session.user.id)
          setProfile(profileData)
        } else {
          console.log('No session found')
        }
      } catch (err) {
        console.error('Auth init error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          // Don't block on profile fetch - it might not exist for new users
          safeGetProfile(session.user.id).then(profileData => {
            setProfile(profileData)
          })
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    if (user) {
      const profileData = await getProfile(user.id)
      setProfile(profileData)
    }
  }

  const value = {
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    // Pro users have active subscription
    isPro: profile?.subscription_status === 'active',
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Protected Route component
export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Will be handled by router
    return null
  }

  return children
}
