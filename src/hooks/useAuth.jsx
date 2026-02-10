import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase, getProfile, ensureProfileAndSettings } from '../lib/supabase'

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

    // Repair missing profile rows so paid users are not treated as free forever.
    const getProfileWithSelfHeal = async (authUser) => {
      const existingProfile = await safeGetProfile(authUser.id)
      if (existingProfile) return existingProfile

      try {
        const repairedProfile = await ensureProfileAndSettings(authUser)
        if (repairedProfile) {
          console.log('Recovered missing profile for:', authUser.email)
          return repairedProfile
        }
      } catch (err) {
        console.warn('Profile self-heal failed:', err)
      }

      return null
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
          const profileData = await getProfileWithSelfHeal(session.user)
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
          getProfileWithSelfHeal(session.user).then(profileData => {
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

  const refreshProfile = useCallback(async () => {
    if (user) {
      let profileData = await getProfile(user.id)
      if (!profileData) {
        profileData = await ensureProfileAndSettings(user)
      }
      setProfile(profileData)
      return profileData
    }
    return null
  }, [user])

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
